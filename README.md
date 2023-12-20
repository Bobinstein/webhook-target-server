# Simple AR.IO Gateway Email Server

## Quickstart Guide

### Prerequisites

- Nodejs (suggested v20.9.0)
- Yarn

### Set Email Information in .env

Open `.env.example` and change the values to match the email account you want to send emails from:

- `SENDER_EMAIL`: The email address you want to send mail FROM
- `EMAIL_PASSWORD`: The password for your email account
- `SMTP_HOST_ADDRESS`: The address of your SMTP server. Leave this blank if you are using a Gmail account.

Rename the file to just `.env`

### Install Dependencies

```
yarn install
```

### Build and Start the Server

```
yarn build
yarn start
```

### Manage email recipients

Email recipients are managed using the `/add` and `/remove` endpoints. Simply make a `POST` to this server (while it is running) using the following format:

```
axios.post(`${serverUrl}/${action}`, { email })
```

The recipient list is stored in an sql database, so it will persist through restarting the server.

## Troubleshooting

Check your firewall