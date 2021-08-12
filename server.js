const path = require("path");
const fetch = require("node-fetch");
const FormData = require("form-data");
const fastify = require("fastify")({
  logger: false
});


const schema = {
  type: 'object',
  required: ['REDIRECT_URL', 'DISCORD_REDIRECT_URI', 'DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET'],
  properties: {
    REDIRECT_URL: { type: 'string' },
    DISCORD_REDIRECT_URI: { type: 'string' },
    DISCORD_CLIENT_ID: { type: 'string' },
    DISCORD_CLIENT_SECRET: { type: 'string' }
  }
}

fastify.register(require('fastify-env'), {
  schema,
  dotenv: true
})

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

fastify.get("/", async function(request, reply) {
  if (!request.query['code'])
   return reply.redirect(fastify.config.REDIRECT_URL)
    const access_token = await discordFetchState(request.query['code'].toString());
    const discordUser = await discordFetchUser(access_token);
    
    let params = {
      id: discordUser.id,
      username: discordUser.username,
      avatar: discordUser.avatar ? 'https://cdn.discordapp.com/avatars/' + discordUser.id + '/' + discordUser.avatar + '.jpeg' : 'https://i.imgur.com/DC0Kp0D.png',
    }
    reply.view("/src/pages/index.hbs", params);
});

fastify.post("/", function(request, reply) {
  reply.view("/src/pages/authorized.hbs");
  
});

fastify.get('/autorized', async function (request, reply) {
  if (!request.query['code'])
   return reply.redirect(fastify.config.REDIRECT_URL)

   reply.redirect(`/?code=${request.query['code'].toString()}`)

})

fastify.listen(process.env.PORT || 3000, function(err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }

  console.log(`Your app is listening on ${address}`);
  fastify.log.info(`server listening on ${address}`);
  
});

async function discordFetchState(code) {
  const bodyFormData = new FormData();
  bodyFormData.append('code', code)
  bodyFormData.append("redirect_uri", fastify.config.DISCORD_REDIRECT_URI);
  bodyFormData.append("grant_type", "authorization_code");
  bodyFormData.append("client_id", fastify.config.DISCORD_CLIENT_ID);
  bodyFormData.append("client_secret", fastify.config.DISCORD_CLIENT_SECRET);
  bodyFormData.append("scope", "identify");

  const response = await fetch("https://discord.com/api/oauth2/token", {
    method: 'POST',
    headers: bodyFormData.getHeaders(),
    body: bodyFormData,
    redirect: 'follow'
  });
  const responseJsonParsed = await response.json();

  if (!responseJsonParsed.access_token) throw new Error('No access_token found');
   const access_token = responseJsonParsed.access_token;

   return access_token;
}

async function discordFetchUser(access_token) {
  const res = await fetch('https://discordapp.com/api/users/@me', {
    headers: {
      'Authorization': 'Bearer ' + access_token
    }
  })
  return await res.json();
}