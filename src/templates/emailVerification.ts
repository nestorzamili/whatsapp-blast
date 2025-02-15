const styles = `
  /* Base Styles */
  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: #f9f9f9;
    margin: 0;
    padding: 0;
  }
  .container {
    max-width: 600px;
    width: 100%;
    margin: 0 auto;
    padding: 20px;
    background-color: #ffffff;
    border-radius: 12px;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  }
  .header { text-align: center; }
  .header img { max-width: 120px; height: auto; }
  .content { text-align: center; }
  .content h1 {
    color: #2c3e50;
    font-size: 28px;
    margin-bottom: 20px;
    font-weight: 600;
  }
  .content p {
    color: #34495e;
    font-size: 16px;
    line-height: 1.6;
    margin-bottom: 20px;
  }
  .button {
    display: inline-block;
    margin-top: 20px;
    padding: 14px 28px;
    background-color: #3498db;
    color: #ffffff;
    text-decoration: none;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 600;
    transition: background-color 0.3s ease;
  }
  .button:hover { background-color: #2980b9; }
  .footer {
    margin-top: 30px;
    padding: 20px;
    background-color: #f4f4f4;
    border-radius: 8px;
    text-align: center;
    font-size: 14px;
    color: #7f8c8d;
  }
  .footer a {
    color: #3498db;
    text-decoration: none;
    font-weight: 600;
  }
  .footer a:hover { text-decoration: underline; }
  .footer p { margin: 5px 0; }

  @media only screen and (max-width: 600px) {
    .container { padding: 15px; border-radius: 0; box-shadow: none; }
    .content h1 { font-size: 24px; }
    .content p { font-size: 14px; }
    .button { width: 100%; padding: 12px; font-size: 14px; box-sizing: border-box; }
    .footer { padding: 15px; font-size: 12px; }
  }
`;

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
}) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${styles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://res.cloudinary.com/navindo/image/upload/f_auto/t_wa-blast/v1739636120/wa-logo_nze8v4.png" alt="Company Logo">
    </div>
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
