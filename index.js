const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;

//middleware
app.use(cors())
app.use(express.json())


const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({error: true, message: 'Unauthorized access'})
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).send({error:true, message: 'Unauthorized access'})
    }
    req.decoded = decoded;
    next();
  })
}



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.d2bgkkq.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    const usersCollection = client.db('sportsDb').collection('users')
    const instructorsCollection = client.db('sportsDb').collection('instructors')
    const reviewsCollection = client.db('sportsDb').collection('reviews')
    const classesCollection = client.db('sportsDb').collection('classes')

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = {email: email}
      const user = await usersCollection.findOne(query)
      if (user?.role !== 'admin') {
        return res.status(403).send({error: true, message: 'forbidden'})
      }
      next();
    }

    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = {email: email}
      const user = await usersCollection.findOne(query)
      if (user?.role !== 'instructor') {
        return res.status(403).send({error: true, message: 'forbidden'})
      }
      next();
    }

    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
      res.send({token})
    })

    app.get('/users',verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = {email: user.email}
      const previousUser = await usersCollection.findOne(query)
      if (previousUser) {
        return res.send({message: 'User already exist!!'})
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })

      app.get('/instructors', async (req, res) => {
          const result = await instructorsCollection.find().toArray()
          res.send(result)
      })

      app.get('/reviews', async (req, res) => {
          const result = await reviewsCollection.find().toArray()
          res.send(result)
      })

    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({admin: false})
      }

      const query = {email: email}
      const user = await usersCollection.findOne(query)
      const result = {admin: user?.role === 'admin'}
      res.send(result)
      })

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id)}
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result);
      })


    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id)}
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result);
      })


      //classes collection
    app.post('/classes', async (req, res) => {
      const item = req.body;
      const result = await classesCollection.insertOne(item)
      res.send(result)
      })




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('Sports is Playing')
})

app.listen(port, () => {
    console.log(`Sports Club is Playing on Port: ${port}`)
})
