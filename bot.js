// A simple bot to post pictures on twitter.

"use strict";

var fs          = require('fs'),
    path        = require('path'),
    mkdirp      = require('mkdirp'),
    getDirName  = require('path').dirname,
    http        = require('http'),
    Twit        = require('twit'),
    config      = require(path.join(__dirname, 'config.js'));

var T = new Twit(config);

//T.post('statuses/update', { status: 'Hello world from yet another twitter bot!' }, function (err, data, response) {
//    console.log(data)
//});

// Helper function to generate status update.
function compose_status() {
    var time = new Date();
    var hour = time.getHours();
    var status = 'It is ' + time.toLocaleTimeString() + '. ';
    
    switch (true) {
        case (hour < 6):
            status += 'Go back home! Nobody should be here.';
            break;
        case (hour >= 6 && hour < 12):
            status += 'Good morning, come play!';
            break;
        case (hour >= 12 && hour < 18):
            status += 'Good afternoon, anybody here?';
            break;
        case (hour >= 18):
            status += 'Good evening, anybody here?';
            break;
    }
    status += 'http://www.novascotiawebcams.com/en/webcams/yarmouth-skatepark/';
    return status;
}

//
// Uplade one image to twitter and post it.
//
function upload_image(image_file_path) {
    // read image into base64
    let b64content = fs.readFileSync(image_file_path, { encoding: 'base64' });

    // first we must post the media to Twitter
    T.post('media/upload', { media_data: b64content }, function (err, data, response) {
    //    if (err) {
    //        console.log(err);
    //    }
    //    else {
    //        console.log('uploaded an image!');
    //        T.post('statuses/update',
    //            { media_ids: new Array(data.media_id_string) },
    //            function (err, data, response) {
    //                if (err) {
    //                    console.log(err);
    //                } else {
    //                    console.log('posted an image!');
    //                }
    //            }
    //        );
    //    }
    //});
    
        // now we can assign alt text to the media, for use by screen readers and
        // other text-based presentations and interpreters
        var mediaIdStr = data.media_id_string;
        var altText = "Yarmouth skatepark";
        var meta_params = { media_id: mediaIdStr, alt_text: { text: altText } };
        
        T.post('media/metadata/create', meta_params, function (err, data, response) {
            if (!err) {
                // now we can reference the media and post a tweet (media will attach to the tweet)
                var params = { status: compose_status(), media_ids: [mediaIdStr] }
                T.post('statuses/update', params, function (err, data, response) {
                    console.log('posted an image!')
                })
            }
        })
    })
}



//
// download image form given url and post to twitter
//
function download_upload(url) {
    console.log('downloading ' + url);
    
    // Create the same directory as in server path
    let dest = url.replace('http://images.novascotiawebcams.com/', '');
    mkdirp.sync(getDirName(dest), function (err) {
        if (err)
            console.log(err);
    });
    
    // Save the file
    let file = fs.createWriteStream(dest);
    let request = http.get(url, function (response) {
        response.pipe(file);
        file.on('finish', function () {
            file.close();
            
            // Downloaded, posting to twitter
            console.log('saved to ' + dest);
            upload_image(dest);
        });
    });
    request.on('error', function (err) {
        ImagePuller.fs.unlink(dest);
        console.log('download failed for ' + url);
    });
}


//
// fetch the url of latest image, download it to local disk, and post to twitter
//
function geturl_download_upload(site) {
    // Sample URL to request a single image
    // http://api.novascotiawebcams.com/api/image_profile/yarmouthskatepark/images?relative_timestamp=0&period=0
    
    //    let apiUrl = `http://api.novascotiawebcams.com/api/image_profile/${site}/images?relative_timestamp=0&period=0`;
    
    let apiUrl = 'http://api.novascotiawebcams.com/api/image_profile/' + site + '/images?relative_timestamp=0&period=0';
    console.log('retriving image url from: ' + apiUrl);

    // One liner to make jquery works for nodejs.
    let $ = require('jquery')(require("jsdom").jsdom().defaultView);
    $.getJSON(apiUrl, function (json) {
        // Parse the json and download one image
        download_upload(json.images[0].url);
    });
}


// Periodic function called every second
var last_hour = 0;
function periodic_callback() {
    let time = new Date();

    console.log(time.toTimeString());
    if (time.getHours()>last_hour || time.getHours() == 0) {
        geturl_download_upload('yarmouthskatepark');
        last_hour = time.getHours();
    }
}
// Kick off the periodic posting
setInterval(periodic_callback, 60 * 1000);

