const path = require("path");
const fetch = require("node-fetch");
const FormData = require("form-data");
const fastify = require("fastify")({
  logger: false
});

const schema = {
  type: 'object',
  required: ['REDIRECT_URL', 'DISCORD_INVITE_URL', 'DISCORD_REDIRECT_URI', 'DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'DISCORD_TOKEN_BOT'],
  properties: {
    REDIRECT_URL: { type: 'string' },
    DISCORD_INVITE_URL: { type: 'string' },
    DISCORD_REDIRECT_URI: { type: 'string' },
    DISCORD_CLIENT_ID: { type: 'string' },
    DISCORD_CLIENT_SECRET: { type: 'string' },
    DISCORD_TOKEN_BOT: { type: 'string' }
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

const messageWelcome = `¡Genial!, te has verificado correctamente en nuestra comunidad.

Recuerda con el fin de organizar mejor el contenido de las publicaciones y facilitar la ayuda de informacion de sus consultas, agradecemos a los miembros de la Comunidad utilizar los canales correspodientes con el tema que van a publicar.

[Enlaces]
**Portal mybot**
https://portalmybot.com/

**Discord invitación**
https://discord.gg/g6ssSmK`;

fastify.get("/", async function(request, reply) {
  if (!request.query['code'])
   return reply.redirect(fastify.config.REDIRECT_URL)
    const access_token = await discordFetchState(request.query['code'].toString());
    const discordUser = await discordFetchUser(access_token);
    const Member =  await getGuildMember(discordUser.id, '312846399731662850');
    
    if (!Member.user) return reply.redirect(fastify.config.DISCORD_INVITE_URL)
    if (Member.roles.includes('359481600347602944')) return reply.redirect(fastify.config.DISCORD_INVITE_URL)
    await addRole(discordUser.id, '312846399731662850', '359481600347602944');
    await removeRole(discordUser.id, '312846399731662850', '495089310626873365');
    
    let msg = `<@${Member.user.id}>, Bienvenid@ a **MyBOT Team**\nPara obtener más información acerca del servidor lea <#359421930303913995> y <#359422036625588235>.`;

    let msgEmbed = [{
      "author": {
        "name": `Usuario verificado : ${Member.user.username} (${Member.user.id})`,
        "icon_url": Member.user.avatar ? 'https://cdn.discordapp.com/avatars/' + Member.user.id + '/' + Member.user.avatar + '.jpeg' : 'https://i.imgur.com/DC0Kp0D.png',
        "proxy_icon_url": 'https://portalmybot.com/'
        
      },
      "color": 65535
    }];

    let msgEmbedLog = [{
      "author": {
        "name": `${discordUser.username}#${discordUser.discriminator} | (${discordUser.id})`,
        "icon_url": discordUser.avatar ? 'https://cdn.discordapp.com/avatars/' + discordUser.id + '/' + discordUser.avatar + '.jpeg' : 'https://i.imgur.com/DC0Kp0D.png',
        "proxy_icon_url": 'https://portalmybot.com/'
      },
      "footer": {
        "text": "Entrada",
      },
      "color": 65280
    }];

    await sendToChannel('464153472946929665', msg, false);
    await sendToChannel('516032131726835752', '', msgEmbed);
    await sendToChannel('464137463426711578', '', msgEmbedLog);
    await sendToUser(discordUser.id, messageWelcome);

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

fastify.get('/authorized', async function (request, reply) {
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
  const res = await fetch('https://discord.com/api/users/@me', {
    headers: {
      'Authorization': 'Bearer ' + access_token
    }
  })
  return await res.json();

}

async function getGuildMember(iduser, idguild) {
  const userID = iduser;
  const guildID = idguild;

  const res = await fetch(`https://discord.com/api/guilds/${guildID}/members/${userID}`, {
    method: "get",
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bot ${fastify.config.DISCORD_TOKEN_BOT}`
    }
  })
  return await res.json();
}

async function addRole(iduser, idguild, idrol) {
  const userID = iduser;
  const guildID = idguild;
  const roleID = idrol;

  await fetch(`https://discord.com/api/guilds/${guildID}/members/${userID}/roles/${roleID}`, {
    method: "put",
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bot ${fastify.config.DISCORD_TOKEN_BOT}`
    }
  })
  
}
async function removeRole(iduser, idguild, idrol) {
  const userID = iduser;
  const guildID = idguild;
  const roleID = idrol;

  await fetch(`https://discord.com/api/guilds/${guildID}/members/${userID}/roles/${roleID}`, {
    method: "delete",
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bot ${fastify.config.DISCORD_TOKEN_BOT}`
    }
  })
  
}

async function sendToChannel(idchannel, content, embeds) {
  const channelId = idchannel;
  let data = {
    "content": content,
    "tts": false
    }
  
  if(embeds) data.embeds = embeds
  await fetch(`https://discord.com/api/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bot ${fastify.config.DISCORD_TOKEN_BOT}`
    },
    body: JSON.stringify(data)
  })
}

async function sendToUser(iduser, content) {
  try {

    const res = await fetch('https://discord.com/api/users/@me/channels', {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bot ${fastify.config.DISCORD_TOKEN_BOT}`
      },
      body: JSON.stringify({
        recipient_id: iduser
      })
    })
    
    const userMD = await res.json();
    const channelId = userMD.id
   
    await fetch(`https://discord.com/api/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bot ${fastify.config.DISCORD_TOKEN_BOT}`
      },
      body: JSON.stringify({
        "content": content,
      })
    })

  } catch (err) {
    console.error(`No se pudo enviar un mensaje al usuario ${iduser}`, err)
  }
  
}