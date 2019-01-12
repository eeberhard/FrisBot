function randomXKCD() {
  
  var url = "https://c.xkcd.com/random/comic/";
  var image_exp = /Image URL \(for hotlinking\/embedding\): (http.*?\.(?:(?:png)|(?:gif)))/g;
  var number_exp = /Permanent link to this comic: (http.+?\/(\d+?)\/)/;
  
  //Permanent link to this comic: https://xkcd.com/1885/
  
  var image, number;
  var tries = 0;
  while (!image || !number) {
    try {
      var response = UrlFetchApp.fetch(url).getContentText();
    }
    catch(e) {
      tries = tries + 1;
      
      if (tries > 20)
        throw(e);
      
      continue;
    }
    
    var match = image_exp.exec(response);
    if(match && match.length == 2)
      image = match[1];
    
    match = number_exp.exec(response);
    if(match && match.length == 3)
      number = match[2];
  }
  
  return {'image': image, 'number': number};   
}

function specificXKCD(number) {
  
  number = parseInt(number);
 
  var url = "https://xkcd.com/" + number + "/";
  var image_exp = /Image URL \(for hotlinking\/embedding\): (http.*?\.(?:(?:png)|(?:gif)))/g;
  
  var image;
  var tries = 0;
  while (!image) {
    try {
      var response = UrlFetchApp.fetch(url).getContentText();
    }
    catch(e) {
      tries = tries + 1;
      
      if (tries > 10)
        throw(e);
      
      continue;
    }
    
    var match = image_exp.exec(response);
    if(match && match.length == 2)
      image = match[1];
  }
  
  Logger.log(number + " - " + image);
  
  return {'image': image, 'number': number};  
  
}

function newestXKCD() {
  
  var url = "https://xkcd.com/";
  var image_exp = /Image URL \(for hotlinking\/embedding\): (http.*?\.(?:(?:png)|(?:gif)))/g;
  var number_exp = /Permanent link to this comic: (http.+?\/(\d+?)\/)/;
  
  var image, number;
  var tries = 0;
  while (!image || !number) {
    try {
      var response = UrlFetchApp.fetch(url).getContentText();
    }
    catch(e) {
      tries = tries + 1;
      
      if (tries > 10)
        throw(e);
      
      continue;
    }
    
    var match = image_exp.exec(response);
    if(match && match.length == 2)
      image = match[1];
    
    match = number_exp.exec(response);
    if(match && match.length == 3)
      number = match[2];
  }
  
  Logger.log(number + " - " + image);
  
  return {'image': image, 'number': number};   
}


function randomDadJoke() {
  
  var url = "https://icanhazdadjoke.com/";
  
  var headers = {
    "User-Agent" : "FrisBot (smlfrisbot@gmail.com)",
    "Accept" : "text/plain"
  }; 
  
  var options = {
       "method" : "get",
       "headers" : headers
  };
  
  var response = UrlFetchApp.fetch(url, options)
  
  return response.getContentText()
  
}
