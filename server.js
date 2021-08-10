const path = require("path");

const fastify = require("fastify")({
  logger: false
});

fastify.register(require("fastify-static"), {
  root: path.join(__dirname, "public"),
  prefix: "/"
});


fastify.register(require("fastify-formbody"));

fastify.register(require("point-of-view"), {
  engine: {
    handlebars: require("handlebars")
  }
});

fastify.get("/", function(request, reply) {
  reply.view("/src/pages/index.hbs");
  
});

fastify.post("/", function(request, reply) {
  reply.view("/src/pages/authorized.hbs");
  
});

fastify.listen(process.env.PORT, function(err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`Your app is listening on ${address}`);
  fastify.log.info(`server listening on ${address}`);
});
