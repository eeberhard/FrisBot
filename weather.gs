function testLogic() {
  var summary = outdoorLogic(getWeather(), 'Friday')
  
  Logger.log(summary)
}


function getWeather() {
  
  //var url = "http://api.wunderground.com/api/bb073dcf6c2c35ec/astronomy/conditions/forecast/q/51.71,-0.21.json"
  var url = "http://api.wunderground.com/api/bb073dcf6c2c35ec/conditions/forecast/q/51.72,-0.22.json"
  
  
  var json = "";
  var debug = false;
  
  if(!debug) {
    var response = UrlFetchApp.fetch(url);
    json = response.getContentText();
  }
  else {
    var scriptProperties = PropertiesService.getScriptProperties();
    
    var keys = scriptProperties.getKeys();
    var weatherkeys = [];
    for(var i=0; i < keys.length; i++) {
      
      if(keys[i].indexOf('weather_example_') != -1)
        weatherkeys.push(keys[i]);
      
    }
    
    weatherkeys = weatherkeys.sort();
    
    for(i=0; i < weatherkeys.length; i++) {
      
      json += scriptProperties.getProperty(weatherkeys[i])
      
    }
  }
  
  var weather = JSON.parse(json)
  
  return weather;
  
}


function outdoorLogic(weather, day) {
  
  var condition = weather.condition;
  var forecast = weather.forecast;
  
  //default to first result
  var txt_forecastday = 0, simpleforecastday = 0;
  
  
  for (var d=0; d < forecast.txt_forecast.forecastday.length; d++) {
    if (forecast.txt_forecast.forecastday[d].title == day)
      txt_forecastday = d;
  }
  for (d=0; d < forecast.simpleforecast.forecastday.length; d++) {
    if (forecast.simpleforecast.forecastday[d].date.weekday == day)
      simpleforecastday = d;
  }
  
  var txt_day = forecast.txt_forecast.forecastday[txt_forecastday];
  var simpleday = forecast.simpleforecast.forecastday[simpleforecastday]; 
  
  var nogo = [];
  
  if(simpleday.high.celsius < 10)
    nogo.push('cold temperature')
    
  if(simpleday.high.celsius > 30)
    nogo.push('high temperature')
  
  if(simpleday.avewind.kph > 22)
    nogo.push('high wind')
    
  if(simpleday.qpf_day.mm > 1)
    nogo.push('rain')
    
  if(simpleday.snow_day.cm > 1)
    nogo.push('snow')
    
  var text = txt_day.fcttext_metric;
  
  var outside = false;
  
  if(nogo.length == 0) {
    text = text + " Conditions seem favourable for an outdoor game!"
    outside = true;
  }
  else if(nogo.length == 1)
    text = text + " Conditions may require an indoor game due to " + nogo[0] + ".";
  else
    text = text + " Conditions may require an indoor game due to " +
      nogo.slice(0,nogo.length-1).join(', ') + " and " + nogo[nogo.length-1] + ".";
    
  var times;
  
  var sunset = getSunset();
  
  if(outside) {
    times = ['12:00 - 13:30', '13:00 - 14:30', '14:00 - 15:30', '15:00 - 16:30'];
    if(sunset > 17)
      times.push('16:00 - 17:30');
  }
  else
    times = ['14:00 - 15:30', '15:00 - 16:30'];
  
  
  var summary = {'outside': outside, 'nogo':nogo, 'text': text, 'times':times, 'day':txt_day.title,
                 'icon': {
                   'url' : txt_day.icon_url,
                   'text' : txt_day.icon,
                 },
                 'weather': {
                   'txt_day':txt_day,
                   'simpleday':simpleday
                 }
                }
  
  return summary;
    
}



function getSunset() {
 
  var url = "https://api.sunrise-sunset.org/json?lat=51.712579&lng=-0.211286&formatted=0"
  
  var response = UrlFetchApp.fetch(url);
  var json = response.getContentText();
  
  var output = JSON.parse(json);
  
  Logger.log(output);
  
  if(output.results.sunset == null)
    return null;
  
  var date = new Date(output.results.sunset);
  
  var sunset = date.getHours() + (date.getMinutes() / 60);
    
  Logger.log("Sunset at " + sunset);
  
  return sunset;
}





function saveExample() {
  
  var url = "http://api.wunderground.com/api/bb073dcf6c2c35ec/astronomy/conditions/forecast/q/51.71,-0.21.json"
  
  var response = UrlFetchApp.fetch(url);
  var json = response.getContentText();
  
  var scriptProperties = PropertiesService.getScriptProperties();
  
  
  //store it in 5000 character chunks
  
  var start = 0
  var name;
  
  while(start < json.length) {
    var name = "weather_example_" + start/5000;
    scriptProperties.setProperty(name, json.slice(start, start + 5000));
    start += 5000;
  }
  
  
}
  
  
