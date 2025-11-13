const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const admin = require("firebase-admin");
const serviceAccount = require("./good-gather-firebase-adminsdk.json");
const port = process.env.PORT || 3000;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

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

const verifyToken = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({
      message: "unauthorized access",
    });
  }
  const token = authorization.split(" ")[1];

  if (!token) {
    return res.status(401).send({
      message: "unauthorized access token",
    });
  }
  try {
    const decode = await admin.auth().verifyIdToken(token);
    req.token_email = decode.email;

    next();
  } catch (error) {
    res.status(401).send({
      message: "unauthorized access",
    });
  }
};

async function run() {
  try {
    // await client.connect();

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

    app.get("/joined", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = {};
      if (email) {
        if (email !== req.token_email) {
          return res.status(403).send({ message: "forbidden access" });
        }
        query.joinedBy = email;
      }
      const cursor = joinedCollection.find(query).sort({
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
      const isExist = await joinedCollection.findOne({ eventId: data.eventId });
      if (isExist) {
        res.send({
          success: false,
          message: "Already joined this event",
        });
      } else {
        const result = await joinedCollection.insertOne(data);
        console.log(result);

        res.send({
          success: true,
          result,
        });
      }
    });
    // my events
    app.get("/my-events", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = {};
      if (email) {
        if (email !== req.token_email) {
          return res.status(403).send({ message: "forbidden access" });
        }
        query.createdBy = email;
      }

      const result = await eventCollection.find(query).toArray();
      res.send({
        success: true,
        result,
      });
    });
    app.put("/events/:id", async (req, res) => {
      const data = req.body;
      const id = req.params.id;
      const objectId = new ObjectId(id);
      const filter = { _id: objectId };
      const update = {
        $set: data,
      };
      const result = await eventCollection.updateOne(filter, update);

      res.send({
        success: true,
        result,
      });
    });
    app.get("/search", async (req, res) => {
      const search_text = req.query.search;
      const result = await eventCollection
        .find({ title: { $regex: search_text, $options: "i" } })
        .toArray();
      res.send({
        success: true,
        result,
      });
    });
    app.get("/filter", async (req, res) => {
      try {
        const { eventType } = req.query;
        let query = {};

        if (eventType && eventType.toLowerCase() !== "all") {
          query.eventType = eventType;
        }

        const result = await eventCollection.find(query).toArray();

        res.send({
          success: true,
          result,
        });
      } catch (error) {
        console.error("Filter error:", error);
        res.status(500).send({ message: "Failed to filter events" });
      }
    });

    app.delete("/events/:id", async (req, res) => {
      const { id } = req.params;
      const objectId = new ObjectId(id);
      const filter = { _id: objectId };
      const result = await eventCollection.deleteOne(filter);
      res.send({
        success: true,
        result,
      });
    });

    // await client.db("admin").command({ ping: 1 });
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
