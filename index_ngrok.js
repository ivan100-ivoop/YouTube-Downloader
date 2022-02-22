const express = require('express');
const bodyParser = require('body-parser');
const ytdl = require("ytdl-core");
const ffmpeg = require('fluent-ffmpeg');
const ngrok = require('ngrok');
const app = express();

app.use(bodyParser.urlencoded({extended: false}))

const PORT = 3000;
const toHuman = (secs) => {
    var date = new Date(null);
    date.setSeconds(secs);
    var time = date.toISOString().substr(11, 8);
    
    return time;
};
const token = ""
const config = {
  authtoken: token,
  region: 'eu',
  proto: 'tcp',
  addr: PORT
};

app.get('/download', async (req, res)=>{
	var url = req.query.url || null;
	var type = req.query.type || "mp4";
	if(url != null){
		const data = await ytdl.getInfo(url);
		res.setHeader('Content-disposition', 'attachment; filename=' + data.videoDetails.title + "." + type);
		if(type == "mp3"){
			encodeMP3(res, data.videoDetails.videoId, data.videoDetails.title);
		}else{
			getMP4(res, data.videoDetails.videoId);
		}
	}else{
		res.set('Content-Type', 'application/json')
		res.send({error: 1, status: 404, message: "!!!Missing URL!!!"});
	}
});

function encodeMP3(res, url, title){
	res.set('Content-Type', 'audio/mpeg');
	ffmpeg(ytdl(url ,{ filter: format => format.container === 'mp4' }))
    .audioCodec('libmp3lame')
    .toFormat("mp3")
    .outputOptions(['-preset', 'veryfast', '-b:a', '320k', '-id3v2_version', '4', '-metadata', 'title=' + title])
    .on('error', function(err) {
      console.log('An error occurred: ' + err.message);
    })
    .on('end', function() {
      console.log('Processing finished !');
      res.end()
    })
    .on('filenames', function(e) {
      console.log(e);
      res.end()
    })
    .output(res, { end: true })
    .run();
  }

function getMP4(res, url){
	res.set('Content-Type', 'video/mpeg');
	ytdl(url,{ filter: format => format.container === 'mp4' })
	.on("data", d => res.write(d))
	.on("end", () => res.end());
}

app.get('/', async (req, res)=>{
  var url = req.query.url || null;
  res.set('Content-Type', 'application/json')
	if(url !=null){
    const data = await ytdl.getInfo(url);
    let format = ytdl.chooseFormat(data.formats, { quality: '134' });
		res.send({
      id: data.videoDetails.videoId,
      title: data.videoDetails.title,
      image: data.videoDetails.thumbnails[0].url,
      mp4:{
        quality: format.qualityLabel,
        mimetype: format.mimeType,
        url: "/download?url=" + data.videoDetails.videoId,
      },
      mp3: {
        quality: "320k",
        mimetype: "audio/mp3; codecs=\"libmp3lame\"",
        url: "/download?type=mp3&url=" + data.videoDetails.videoId
      }
      })
  }else{
		res.send({error: 1, status: 404, message: "!!!Missing URL!!!"});
	}
})

async function startNgrok(){
  const remote_url = await ngrok.connect(config);
  console.log("Remote URL: " + remote_url);
}

app.listen(PORT, ()=>{
  console.log("Is Running on PORT " + PORT);
  startNgrok();
});
