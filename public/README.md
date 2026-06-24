# UnifyAwards 2026

A complete Node.js + Express game jam website with a JSON-backed admin panel.

## Run locally

```bash
npm install
npm start
```

Open:

```txt
http://localhost:3000
```

Admin panel:

```txt
http://localhost:3000/admin
```

Default login:

```txt
Username: admin
Password: changeme
```

## Change admin login

Create a `.env` file in the project root:

```env
PORT=3000
ADMIN_USERNAME=yourusername
ADMIN_PASSWORD=yourpassword
SESSION_SECRET=make-this-long-and-random
```

Restart the server after changing `.env`.

## Replace the logo

Replace this file:

```txt
public/assets/logo.png
```

Keep the same filename, or edit the image path in the HTML files.

## Edit website data

Use the admin panel at `/admin`. Changes are saved in:

```txt
data/siteData.json
```

This means your countdown, guidelines, information, podium, and leaderboard data will stay saved after server restarts.

## Deploy later

Upload the full project to GitHub, then deploy on a Node host such as Render, Railway, Fly.io, or a VPS.

Use:

```txt
Build Command: npm install
Start Command: npm start
```

Set environment variables on the host:

```env
ADMIN_USERNAME=yourusername
ADMIN_PASSWORD=yourpassword
SESSION_SECRET=make-this-long-and-random
```

## Discord sign-in + registration setup

1. Go to the Discord Developer Portal and create an application.
2. Open the application's OAuth2 page.
3. Copy the Client ID and Client Secret into your Render environment variables:
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`
4. Add this redirect URL in Discord OAuth2 redirects:
   - Local testing: `http://localhost:3000/auth/discord/callback`
   - Render/live site: `https://YOUR-DOMAIN.com/auth/discord/callback`
5. Add the same live URL to Render as:
   - `DISCORD_CALLBACK_URL=https://YOUR-DOMAIN.com/auth/discord/callback`
6. Keep the OAuth scope as `identify`. The site only needs Discord ID, username, and avatar.

Users can now visit `/signin`, continue via Discord, then register at `/register`. Each Discord account can only register one team. Admins can view registered teams in the Participants section on `/admin`.
