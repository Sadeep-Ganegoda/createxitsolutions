# Azure Face Login Demo

Simple Node.js + browser webcam demo using Azure AI Face.

## Features
- Register a username with a face image
- Capture a fresh webcam image for login
- Azure Face Detect + Verify
- Azure API key stays on the backend
- Render deployment configuration included

## Local setup
1. Copy `.env.example` to `.env`.
2. Set `AZURE_FACE_ENDPOINT` and `AZURE_FACE_KEY`.
3. Run `npm install`.
4. Run `npm start`.
5. Open `http://localhost:3000`.

## Render deployment
Create a new Render Blueprint/Web Service from this repository. Add these secret environment variables in Render:
- `AZURE_FACE_ENDPOINT`
- `AZURE_FACE_KEY`

Do not commit the real key to GitHub.

## Azure limitation
Azure Face Verify is a Limited Access capability. Face detection may work even if Verify is not enabled for the resource.

## Security
This is a demo, not production authentication. A real deployment should add liveness detection, passkey/MFA fallback, rate limiting, encrypted biometric storage, consent/retention controls, a proper database, and secure sessions.
