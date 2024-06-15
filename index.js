require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");

const Phonebook = require("./models/mongo");

app.use(express.json());
app.use(cors());
app.use(express.static("dist"));

const errorHandler = (error, request, response, next) => {
  console.error(error.message);

  error.statusCode = error.statusCode || 500;
  error.status = error.status || "error";

  if (error.name === "CastError") {
    return response.status(400).send({ error: "malformatted id" });
  } else if (error.name === "ValidationError") {
    return response.status(400).json({ error: error.message });
  }

  response.status(error.statusCode).json({
    status: error.statusCode,
    message: error.message,
  });

  next(error);
};

app.get("/info", (request, response) => {
  const counter = Phonebook.collection.countDocuments({});
  counter.then((count) => {
    response.send(`
                  <div>The Phonebook has info for ${count} entries.</div>
                  <div>${new Date()}</div>
                 `);
  });
});

app.get("/api/persons", (request, response, next) => {
  Phonebook.find({})
    .then((notes) => {
      response.json(notes);
    })
    .catch((error) => next(error));
});

app.get("/api/persons/:id", (request, response, next) => {
  Phonebook.findById(request.params.id)
    .then((note) => {
      if (!note) {
        const error = new Error("person not found");
        error.statusCode = 404;
        throw error;
      }

      response.json(note);
    })
    .catch((error) => next(error));
});

app.delete("/api/persons/:id", (request, response, next) => {
  Phonebook.findByIdAndDelete(request.params.id)
    .then((res) => {
      if (res) {
        response.status(204).end();
      } else {
        const error = new Error("this person does not exist");
        error.statusCode = 400;
        throw error;
      }
    })
    .catch((error) => next(error));
});

app.post("/api/persons", (request, response, next) => {
  const body = request.body;

  if (!body.name || !body.number) {
    const error = new Error("content missing");
    error.statusCode = 400;
    return next(error);
  }

  const person = new Phonebook({
    name: body.name,
    number: body.number,
  });

  person
    .save()
    .then((savedPerson) => {
      response.json(savedPerson);
    })
    .catch((error) => next(error));
});

app.put("/api/persons/:id", (request, response, next) => {
  const body = request.body;

  if (!body.name || !body.number) {
    const error = new Error("content missing");
    error.statusCode = 400;
    return next(error);
  }

  const person = {
    name: body.name,
    number: body.number,
  };

  Phonebook.findByIdAndUpdate(request.params.id, person, {
    new: true,
    runValidators: true,
    context: "query",
  })
    .then((updatedPerson) => {
      if (updatedPerson) {
        response.json(updatedPerson);
      } else {
        response.status(404).end();
      }
    })
    .catch((error) => next(error));
});

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: "unknown endpoint" });
};

app.use(unknownEndpoint);

app.use(errorHandler);

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
