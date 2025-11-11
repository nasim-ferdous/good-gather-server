const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.picyulc.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("good-gatherdb");
    const eventCollection = db.collection("events");
    const joinedCollection = db.collection("joined");
    // events
    app.get("/events", async (req, res) => {
      const cursor = eventCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/events/:id", async (req, res) => {
      const id = req.params.id;
      const objectId = new ObjectId(id);
      const result = await eventCollection.findOne({ _id: objectId });
      res.send({
        success: true,
        result,
      });
    });

    app.post("/events", async (req, res) => {
      const data = req.body;
      const result = await eventCollection.insertOne(data);
      res.send({
        success: true,
        result,
      });
    });
    // joined

    app.get("/joined", async (req, res) => {
      const cursor = joinedCollection.find().sort({
        eventDate: 1,
      });
      const result = await cursor.toArray();
      res.send({
        success: true,
        result,
      });
    });

    app.post("/joined", async (req, res) => {
      const data = req.body;
      console.log(data);
      const result = await joinedCollection.insertOne(data);
      res.send({
        success: true,
        result,
      });
    });
    // my events
    app.get("/my-events", async (req, res) => {
      const email = req.query.email;
      const result = await eventCollection
        .find({
          createdBy: email,
        })
        .toArray();
      res.send({
        success: true,
        result,
      });
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Good Gather server is running");
});

app.listen(port, () => {
  console.log(`Good Gather app is listening on ${port}`);
});
