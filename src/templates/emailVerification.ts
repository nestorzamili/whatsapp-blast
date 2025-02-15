export const emailVerification = ({
  title,
  message,
  buttonText,
  buttonLink,
  message2,
}: {
  title: string;
  message: string;
  buttonText: string;
  buttonLink: string;
  message2: string;
}) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          padding: 20px 0;
        }
        .header img {
          max-width: 150px;
          alt: "WhatsApp Blast Logo";
        }
        .content {
          padding: 20px;
          text-align: center;
        }
        .content h1 {
          color: #333333;
          font-size: 24px;
          margin-bottom: 20px;
        }
        .content p {
          color: #666666;
          font-size: 16px;
          line-height: 1.6;
        }
        .button {
          display: inline-block;
          margin-top: 20px;
          padding: 12px 24px;
          background-color: #007bff;
          color: #ffffff;
          text-decoration: none;
          border-radius: 4px;
          font-size: 16px;
        }
        .footer {
          margin-top: 30px;
          padding: 20px;
          background-color: #f4f4f4;
          border-radius: 8px;
          text-align: center;
          font-size: 14px;
          color: #666666;
        }
        .footer a {
          color: #007bff;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="content">
          <h1>${title}</h1>
          <p>${message}</p>
          <a href="${buttonLink}" class="button">${buttonText}</a>
          <p>${message2}</p>
        </div>
        <div class="footer">
          <p><strong>WhatsApp Blast</strong></p>
          <p>🚀 Created with ❤️ by WhatsApp Blast Team</p>
          <p><a href="https://github.com/nestorzamili/">Visit our website</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
};
