import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";
import { fetchMutation } from "convex/nextjs";

export async function POST(req: Request) {
  // Get the Svix headers for verification
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Get the webhook secret from environment
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SECRET is not set");
    return new Response("Error occured -- missing webhook secret", {
      status: 500,
    });
  }

  // Create a new Svix instance with your secret.
  const wh = new Webhook(webhookSecret);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured -- invalid signature", {
      status: 400,
    });
  }

  // Handle the webhook event
  const eventType = evt.type;

  try {
    switch (eventType) {
      case "user.created":
      case "user.updated": {
        const { id, email_addresses, first_name, last_name, image_url } =
          evt.data;

        const email = email_addresses?.[0]?.email_address ?? "";
        const name =
          [first_name, last_name].filter(Boolean).join(" ") || "User";

        // Call mutation (protected by webhook signature verification above)
        await fetchMutation(api.users.upsertFromClerk, {
          clerkId: id,
          email,
          name,
          avatarUrl: image_url ?? undefined,
        });

        console.log(`User ${eventType === "user.created" ? "created" : "updated"}: ${id}`);
        break;
      }

      case "user.deleted": {
        const { id } = evt.data;

        if (id) {
          // Call mutation (protected by webhook signature verification above)
          await fetchMutation(api.users.deleteFromClerk, {
            clerkId: id,
          });

          console.log(`User deleted: ${id}`);
        }
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    return new Response("Webhook processed successfully", { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response("Error processing webhook", { status: 500 });
  }
}
