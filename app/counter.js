const AWS = require("aws-sdk");
require("dotenv").config();

// Configure AWS SDK (replace with your own credentials from the AWS console)
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN,
  region: "ap-southeast-2",
});

// Create an S3 client
const s3 = new AWS.S3();

// Specify the S3 bucket and object key for the counter
const bucketName = "cab432-n9689109";
const counterKey = "page_counter.json"; // Change the object key to something descriptive

// Function to increment the page counter
async function incrementPageCounter(req, res, next) {
  try {
    const getObjectParams = {
      Bucket: bucketName,
      Key: counterKey,
    };

    let counterData = { counter: 0 };

    try {
      const data = await s3.getObject(getObjectParams).promise();
      counterData = JSON.parse(data.Body.toString("utf-8"));
    } catch (err) {
      if (err.code !== "NoSuchKey") {
        throw err;
      }
    }

    counterData.counter += 1;

    const putObjectParams = {
      Bucket: bucketName,
      Key: counterKey,
      Body: JSON.stringify(counterData), // Convert JSON to string
      ContentType: "application/json", // Set content type
    };

    await s3.putObject(putObjectParams).promise();
    console.log("Page counter incremented successfully.");

    // Continue to the next middleware or route handler
    next();
  } catch (err) {
    console.error("Error incrementing page counter:", err);
    // Handle errors if necessary
    // You can send an error response to the client here
  }
}

// Function to get the page counter value
async function getPageCounter() {
  try {
    const getObjectParams = {
      Bucket: bucketName,
      Key: counterKey,
    };

    let counterData = { counter: 0 };

    try {
      const data = await s3.getObject(getObjectParams).promise();
      counterData = JSON.parse(data.Body.toString("utf-8"));
    } catch (err) {
      if (err.code !== "NoSuchKey") {
        throw err;
      }
    }

    return counterData.counter;
  } catch (err) {
    console.error("Error getting page counter:", err);
    // Handle errors if necessary
    // You can return a default value or throw an error
    return 0; // Default value
  }
}

module.exports = {
  incrementPageCounterMiddleware: incrementPageCounter,
  getPageCounter: getPageCounter,
};
