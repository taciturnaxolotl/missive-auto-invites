import { intro, outro, log, text, note, spinner } from "@clack/prompts";
import { v4 as uuidv4 } from "uuid";
import { parse } from "csv-parse";
import fs from "fs";
import path from "path";

// ------------
// types/constants
// ------------

type user = {
  first_name: string;
  last_name: string;
  email: string;
};

// ------------
// missive api
// ------------
async function getToken(email: string, password: string) {
  const response = await fetch(
    "https://api.missiveapp.com/v1/sessions?client_version=10.60.0&client_id=b9b3eb20-aaf2-46b1-bc3e-b53b879ffb8f&features=login-change,static-drafts,drafts-versioning,style-parts,modified-calendars,unseen-assignment,xfer-accel,plan-downgrade&tz=America/New_York",
    {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "text/plain",
        "sec-ch-ua": '"Not(A:Brand";v="24", "Chromium";v="122"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "sec-gpc": "1",
        Referer: "https://mail.missiveapp.com/",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
      body: `{"sessions":{"email":"${email}","password":"${password}"},"_debug":{"bootstrapped_at":null,"url":"https://mail.missiveapp.com/#login"}}`,
      method: "POST",
    },
  );

  return ((await response.json()) as any).user_session.token;
}

async function invite(
  email: string,
  first_name: string,
  last_name: string,
  token: any,
  organization_id: string,
) {
  const response = await fetch(
    "https://api.missiveapp.com/v1/organization_invites?client_version=10.60.0&client_id=298f01e9-9c91-4da0-9482-5ab2574d8c57&features=login-change,static-drafts,drafts-versioning,style-parts,modified-calendars,unseen-assignment,xfer-accel,plan-downgrade&tz=America/New_York",
    {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "text/plain",
        "sec-ch-ua": '"Not(A:Brand";v="24", "Chromium";v="122"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "sec-gpc": "1",
        Referer: "https://mail.missiveapp.com/",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
      body: `{"organization_invites":{"id":"${uuidv4()}","organization_id":"${organization_id}","address":"${email}","first_name":"${first_name}","last_name":"${last_name}","generic_account_ids":[],"organization_address_ids":[],"integration_ids":[],"shared_label_ids":[],"calendar_account_ids":[],"contact_book_ids":[],"team_user_ids":[],"team_observer_ids":[],"copied_from_user_id":null,"role":"basic"},"auth_token":"${token}","_debug":{"bootstrapped_at":1708969324,"last_server_broadcast":1708969393,"url":"https://mail.missiveapp.com/#"}}`,
      method: "POST",
    },
  );

  return response.json();
}

async function getOrganizationId(token: any) {
  const response = await fetch(
    "https://api.missiveapp.com/v1/organizations?_method=GET&client_version=10.60.0&client_id=9839388a-a547-4575-a5b3-7aa5a04731ad&features=login-change,static-drafts,drafts-versioning,style-parts,modified-calendars,unseen-assignment,xfer-accel,plan-downgrade&tz=America/New_York",
    {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "text/plain",
        "sec-ch-ua": '"Not(A:Brand";v="24", "Chromium";v="122"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "sec-gpc": "1",
        Referer: "https://mail.missiveapp.com/",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
      body: `{"auth_token":"${token}","_debug":{"bootstrapped_at":null,"url":"https://mail.missiveapp.com/#"}}`,
      method: "POST",
    },
  );

  return ((await response.json()) as any).organizations[0].id;
}

// ------------
// load csv
// ------------

async function getUsers() {
  const users: user[] = [];

  const csvFilePath = fs.existsSync("users.csv")
    ? path.resolve(import.meta.dir, "users.csv")
    : "";

  if (csvFilePath == "") {
    log.error("users.csv not found");
    process.exit(1);
  }

  const headers = ["first_name", "last_name", "email"];

  const fileContent = fs.readFileSync(csvFilePath, { encoding: "utf-8" });

  try {
    const parseAsync = (content: string, options: object) =>
      new Promise((resolve, reject) => {
        parse(content, options, (error, result: user[]) => {
          if (error) reject(error);
          else resolve(result);
        });
      });

    const result: user[] = (await parseAsync(fileContent, {
      delimiter: ",",
      columns: headers,
    })) as user[];

    users.push(...result);
  } catch (error) {
    console.error(error);
  }

  // remove the header row
  users.shift();

  return users;
}

// ------------
// tui
// ------------
intro("Welcome to the Missive API!");

note("copywrite 2024 kieran klukas\ncreated for Hamza");

if (!process.env.MISSIVE_EMAIL || !process.env.MISSIVE_PASSWORD) {
  const email = await text({
    message: "What is your email?",
    placeholder: "john@missive-client.com",
    initialValue: process.env.MISSIVE_EMAIL ? process.env.MISSIVE_EMAIL : "",
    validate(value) {
      if (value.length === 0) return `Value is required!`;
      if (!value.includes("@")) return `Invalid email!`;
    },
  });

  const password = await text({
    message: "What is your password?",
    placeholder: "password",
    initialValue: process.env.MISSIVE_PASSWORD
      ? process.env.MISSIVE_PASSWORD
      : "",
    validate(value) {
      if (value.length === 0) return `you need a longer password :)`;
    },
  });

  Bun.write(
    ".env",
    `MISSIVE_EMAIL=${email as string}\nMISSIVE_PASSWORD=${password as string}`,
  );

  log.info("Your email and password have been saved to the .env file");

  process.env.MISSIVE_EMAIL = email as string;
  process.env.MISSIVE_PASSWORD = password as string;
} else {
  log.info("Using already saved values in .env");
}

log.info("loaded users from users.csv");
const users = await getUsers();

note(`Inviting ${users.length} users`);

const token = await getToken(
  process.env.MISSIVE_EMAIL,
  process.env.MISSIVE_PASSWORD,
);

const organization_id = await getOrganizationId(token);

log.success(`Authenticated with Missive. Token: ${token}`);

const invites = spinner();
try {
  invites.start("Inviting users...");
  const totalUsers = users.length;

  for (let index = 0; index < totalUsers; index++) {
    const current = users[index];

    invites.message(`Inviting ${current.email} ${index + 1} of ${totalUsers}`);
    log.info(`Inviting ${current.email}`);
    const response = (await invite(
      current.email,
      current.first_name,
      current.last_name,
      token,
      organization_id,
    )) as any;

    if (response != null) {
      if (response.error) {
        throw new Error(response.error.message);
      }
    }
  }
  invites.stop("Invited all users");
} catch (error) {
  invites.stop(`Failed: "${String(error)}"`, 1);
}

outro("Thanks for using the Missive API; have a great day!");
