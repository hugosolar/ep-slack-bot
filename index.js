require('dotenv').config();
const configData = require('./config-stage.json');
const request = require('request');
const { App } = require("@slack/bolt");
const nodeCron = require("node-cron");
const cronstrue = require('cronstrue');

const app = new App({
  token: process.env.TOKEN,
  signingSecret: process.env.SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.APP_TOKEN
});

let job = [];
const authHeader = "Basic "+ Buffer.from(process.env.SHIELD_USERNAME+":"+process.env.SHIELD_PASSWORD).toString('base64');
const requestOptionsListIndices = {
  url: process.env.EPIO_SERVER+'/_cat/indices/',
  method: 'GET',
  headers: {
    "Authorization": authHeader
  }
}


const statusEmoji = (status) => {
  switch (status) {
    case "green":
      return ':large_green_circle:';
      break;
    case "red":
      return ':red_circle:';
      break;
    case "yellow":
      return ':large_yellow_circle:';
      break;
  
    default:
      return ':card_index_dividers:';
      break;
  }
}

const currentDateTime = () => {
  var today = new Date();
  var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
  var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
  var dateTime = date+' '+time;

  return dateTime;
}

const arrayChunk = (inputArray) => {
  const perChunk = 15;

  const result = inputArray.reduce((resultArray, item, index) => { 
    const chunkIndex = Math.floor(index/perChunk)

    if(!resultArray[chunkIndex]) {
      resultArray[chunkIndex] = [];
    }

    resultArray[chunkIndex].push(item);

    return resultArray
  }, []);

  return result;
}

const startMonitorOn = (site, say) => {
  request(requestOptionsListIndices, (err, response, body) => {
    if (err) {
      say('ERROR: ' + err );
    } else if (response.statusCode === 200) {
      const apiResult = JSON.parse(body);
      const capitalizedSite = site.charAt(0).toUpperCase() + site.slice(1);
      const indices = apiResult.filter(function(element){
        return configData[site].includes(element.index);
      });

      if ( ! indices.length ) {
        say("ERROR: couldn't find that site in the config");
        return false;
      }
      let redIndices = [];
      redIndices = indices.filter((indice) => {
        return (indice.health === 'red');
      });

      if ( ! redIndices.length ) {
        const timestamp = currentDateTime();
        console.log(timestamp + ' - No red indices found for '+ site);
        return false;
      }
      const indicesChunk = arrayChunk(redIndices);

      indicesChunk.forEach( (element, index) => {
        let listIndices = element.map((element) =>{ return " "+statusEmoji(element.health)+" "+element.index+"\n " }).join('');

        const message = {
          text: capitalizedSite+" Alert :warning:",
          blocks:[{
            "type": "header",
            "text": {
              "type": "plain_text",
              "text": "Unhealthy indices found on "+capitalizedSite,
              "emoji": true
            }
          },
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "Indices\n "+listIndices,
            }
          }
        ]
        };
        say(message);
      }
    );
    } else {
      console.log(response.statusCode);
    }
  });
}

const indicesRequest = (site, say) => {

  request(requestOptionsListIndices, (err, response, body) => {
    if (err) {
      say('ERROR: ' + err );
    } else if (response.statusCode === 200) {
      const apiResult = JSON.parse(body);
      const indices = apiResult.filter(function(element){
        return configData[site].includes(element.index);
      });
      const capitalizedSite = site.charAt(0).toUpperCase() + site.slice(1);
      const indicesChunk = arrayChunk(indices);

      if ( ! indices.length ) {
        say("ERROR: couldn't find that site in the config");
        return false;
      }
      
      
      const message = {
        text: capitalizedSite+" indices status",
        blocks:[
      ]
      };
      say(message);

      indicesChunk.forEach( (element, index) => {
        let indicesList = element.map((element) =>{ return " "+statusEmoji(element.health)+" "+element.index+"\n " }).join('');

        const message = {
          text: capitalizedSite+" indices status list",
          blocks:[
            {
              "type": "header",
              "text": {
                "type": "plain_text",
                "text": capitalizedSite+" Indices status",
                "emoji": true
              }
            },
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "Indices list\n "+indicesList,
            }
          }
        ]
        };
        
        if ( index == 1 ){
          message.blocks.shift();
        }

        say(message);
      });

    } else {
      console.log(response.statusCode);
    }
  });
}

const monitorList = (say) => {
  const cronHumanReadable = cronstrue.toString(process.env.CRON);
  const enabledCronJobs = Object.keys(job);
  
  if ( ! enabledCronJobs.length ) {
    say( ':no_mouth: No monitor running at the moment...' );
    return;
  }

  const message = {
    text: "Monitor list",
    blocks:[
      {
        "type": "header",
        "text": {
          "type": "plain_text",
          "text": "Monitor list",
          "emoji": true
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": ":grey_exclamation: Monitor will check: " + cronHumanReadable,
        }
      },
      {
        "type": "divider"
      }
    ]
  };
  enabledCronJobs.forEach( (element) => {
    const capitalizedSite = element.charAt(0).toUpperCase() + element.slice(1);
    message.blocks.push({
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": " :white_check_mark: "+capitalizedSite,
        }
    });
    message.blocks.push({
      "type": "divider"
    });
  });

  say(message);
}

const speakHelp = (say) => {
  const message = {
    text: "Command list",
    blocks:[
      {
        "type": "header",
        "text": {
          "type": "plain_text",
          "text": ":desktop_computer: Command list",
          "emoji": true
        }
      },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "/elasticpress get <site>\n ",
      }
    },
    {
      "type": "divider"
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "/elasticpress monitor-start <site>\n ",
      }
    },
    {
      "type": "divider"
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "/elasticpress monitor-stop <site>\n ",
      }
    },
  ]
  };

  say(message);

  const availableSites = Object.keys(configData);
  
  const sites = {
    text: "Site list",
    blocks:[
      {
        "type": "header",
        "text": {
          "type": "plain_text",
          "text": ":globe_with_meridians: Available sites",
          "emoji": true
        }
      },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": availableSites.join(', '),
      }
    }
  ]
  };

  say(sites);
}

app.command("/elasticpress", async ({ command, ack, say }) => {
  try {
    await ack();
    let txt = command.text.split(" "); // The input parameters
    if ( txt[0] === 'get' ) {
      if ( txt[1] === undefined ) {
        say(':no_entry: ERROR: missing site on second parameter. Use: /elasticpress get <site>');
      } else {
        say('Looking up '+txt[1]+' :mag:' );
        indicesRequest(txt[1], say);
      }
    } else if ( txt[0] === 'monitor-start' ) {
      if ( txt[1] === undefined ) {
        say(':no_entry: ERROR: missing site on second parameter. Use: /elasticpress monitor-start <site>');
      } else {
        site = txt[1];
        // Run the cron every hour
        say(':eyes: :mag: Monitor started for '+site);
        // Recommended CRON value : "0 * * * * *"
        job[site] = nodeCron.schedule(process.env.CRON, function() {
          startMonitorOn(site,say);
        });
        job[site].start();
      }
    } else if ( txt[0] === 'monitor-stop' ) {
      if ( txt[1] === undefined ) {
        say(':no_entry: ERROR: missing site on second parameter. Use: /elasticpress monitor-stop <site>');
      } else {
        site = txt[1];
        job[site].stop();
        job = job.filter( item => item !== site );
        say(':octagonal_sign: Monitor stopped for '+site);
      }
    } else if ( txt[0] === 'monitor-list' ) {
      monitorList(say);
    } else {
      speakHelp(say);
    }
  } catch (error) {
    console.log("err");
    console.error(error);
  }
});

(async () => {
  // Start your app
  await app.start(3000);

  console.log('⚡️ EP monitor app is running!');
})();