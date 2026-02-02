// Garrett Ashcroft

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const TABLE_NAME = process.env.TABLE_NAME;

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({}),
  {
    marshallOptions: { removeUndefinedValues: true },
  }
);

function json(statusCode, bodyObj) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(bodyObj),
  };
}

export const handler = async (event) => {
  try {
    const method =
      event?.requestContext?.http?.method ||
      event?.httpMethod ||
      "GET";

    const path =
      event?.requestContext?.http?.path ||
      event?.path ||
      "/";

    // Basic routing: /items
    if (path.endsWith("/items") && method === "GET") {
      const out = await ddb.send(new ScanCommand({ TableName: TABLE_NAME }));
      return json(200, { count: out.Items?.length ?? 0, items: out.Items ?? [] });
    }

    if (path.endsWith("/items") && method === "POST") {
      const body = event?.body ? JSON.parse(event.body) : {};
      const item = {
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        name: body.name ?? "Unnamed",
        value: body.value ?? null,
      };

      await ddb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: item,
        })
      );

      return json(201, { message: "Created", item });
    }

    // Not found
    return json(404, { message: "Not Found", method, path });
  } catch (err) {
    console.error(err);
    return json(500, { message: "Server Error", error: err?.message ?? "Unknown" });
  }
};
