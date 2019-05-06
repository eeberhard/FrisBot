function testLogic() {
  var summary = outdoorLogic(getWeather(1,15))
  
  Logger.log(summary)
}


function getWeather(daysAhead, hour) {
  return getMetOfficeWeather(daysAhead, hour);
}

function outdoorLogic(weather) {
  
  var nogo = [];
  
  if(weather.temp < 10)
    nogo.push('cold temperature') 
  else if(weather.temp > 30)
    nogo.push('high temperature')
  
  if(weather.wind > 12 || weather.gusts > 20)
    nogo.push('high wind')
    
  if(weather.rain_chance > 10)
    nogo.push(weather.type.toLowerCase())
  
  var text = weather.text;
  
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
    if(sunset > 18)
      times.push('17:00 - 18:30');
  }
  else {
    var scriptProperties = PropertiesService.getScriptProperties();
    times = scriptProperties.getProperty('indoor_times').split(', ');
  }
  
  
  var summary = {'outside': outside, 'nogo':nogo, 'text': text, 'times':times, 'day':weather.day,
                 'icon': {
                   'url' : weather.icon,
                   'text' : weather.type,
                 },
                 'weather': weather
                }
  
  console.log(summary);
  
  return summary;
    
}


function getMetOfficeWeather(daysAhead, hour) {
  var key = '6370534f-939f-412a-b1b9-66912331fced';
  var LOC_ID = 353101; //location ID for Potters Bar
  var REG_ID = 514;    //region ID for London and Southeast 
  var base_url = 'http://datapoint.metoffice.gov.uk/public/data/';
  
  var weather = {};
  
  //gets 3 hourly forecast for the specified site
  var url = base_url + 'val/wxfcs/all/json/' + LOC_ID + '?res=3hourly&key=' + key;
  
  var response = UrlFetchApp.fetch(url);
  var json = response.getContentText();
  var met = JSON.parse(json);
  
  if (daysAhead == null || daysAhead < 0)
    daysAhead = 0;
  else if (daysAhead > 4)
    daysAhead = 4;
  var day = met.SiteRep.DV.Location.Period[daysAhead];
  
  if (hour == null)
    hour = 12;
  
  var zone;
  for (d = 0; d < day.Rep.length; d++) {
    if(day.Rep[d]['$'] >= hour*60) {
      zone = day.Rep[d];
      break;
    }
  }
  
  dateparts = day.value.split('-');
  weather.date = new Date(0);
  weather.date.setYear(dateparts[0]);
  weather.date.setMonth(dateparts[1] - 1);
  weather.date.setDate(dateparts[2].slice(0, -1));
  weather.date.setHours(hour);
  
  weather.day = weather.date.toLocaleDateString('en-GB', { weekday: 'long' });
  weather.temp = zone.T;
  weather.wind = zone.S;
  weather.gusts = zone.G;
  weather.rain_chance = zone.Pp;
  weather.type = getMetWeatherType(parseInt(zone.W)).type;
  weather.humidity = zone.H;
  weather.visibility = zone.V;
  weather.uv = zone.U;
  weather.feel = zone.F;
  weather.wind_direction = zone.D;
  
  //can't embed svg in google form :(
  //weather.icon = 'https://www.metoffice.gov.uk/webfiles/latest/images/icons/weather/' + parseInt(zone.W) + '.svg';
  weather.icon = getMetWeatherType(parseInt(zone.W)).icon;

  //gets text summary forecast for the specified region
  url = base_url + 'txt/wxfcs/regionalforecast/json/' + REG_ID + '?key=' + key;
  
  var response = UrlFetchApp.fetch(url);
  var json = response.getContentText();
  var met = JSON.parse(json);
  
  var period = met.RegionalFcst.FcstPeriods.Period
  
  if (daysAhead == 0)
    weather.text = period[0].Paragraph[1].title + ' ' + period[0].Paragraph[1]['$'];
  else if (daysAhead == 1)
    weather.text = period[0].Paragraph[period[0].Paragraph.length - 1].title + ' ' + period[0].Paragraph[period[0].Paragraph.length - 1]['$'];
  else if (daysAhead < 5)
    weather.text = period[1].Paragraph.title + ' ' + period[1].Paragraph['$'];
  else if (daysAhead < 15)
    weather.text = period[2].Paragraph.title + ' ' + period[2].Paragraph['$'];
  else
    weather.text = period[3].Paragraph.title + ' ' + period[3].Paragraph['$'];
  
  console.log(weather)
  
  return weather;
  
}

function getMetWeatherType(code) {
  
  var type = 'Unknown';
  var icon = 'https://i.imgur.com/JrwEO9a.png';
  switch (code) {
    case 0:	
      type = 'Clear night';
      icon = 'https://i.imgur.com/mVdrqXN.png';
      break;
    case 1:
      type = 'Sunny day';
      icon = 'https://i.imgur.com/U3Nz9G2.png';
      break;
    case 2:	
      type = 'Partly cloudy (night)';
      icon = 'https://i.imgur.com/LdvaN2q.png';
      break;
    case 3:	
      type = 'Partly cloudy (day)';
      icon = 'https://i.imgur.com/VBnOkPd.png';
      break;
    case 4:	
      //Not used
      icon = 'https://i.imgur.com/j63xbNg.png';
      break;
    case 5:	
      type = 'Mist';
      icon = 'https://i.imgur.com/fCVplok.png';
      break;
    case 6:	
      type = 'Fog';
      icon = 'https://i.imgur.com/bjVRmaS.png';
      break;
    case 7:	
      type = 'Cloudy';
      icon = 'https://i.imgur.com/VEW6ovr.png';
      break;
    case 8:	
      type = 'Overcast';
      icon = 'https://i.imgur.com/aqfczfk.png';
      break;
    case 9:	
      type = 'Light rain shower (night)';
      icon = 'https://i.imgur.com/59vsWdO.png';
      break;
    case 10:	
      type = 'Light rain shower (day)';
      icon = 'https://i.imgur.com/TeBFABS.png';
      break;
    case 11:	
      type = 'Drizzle';
      icon = 'https://i.imgur.com/4wanXDg.png';
      break;
    case 12:	
      type = 'Light rain';
      icon = 'https://i.imgur.com/Wx8rqUK.png';
      break;
    case 13:	
      type = 'Heavy rain shower (night)';
      icon = 'https://i.imgur.com/mlppy0M.png';
      break;
    case 14:	
      type = 'Heavy rain shower (day)';
      icon = 'https://i.imgur.com/lCXA3sA.png';
      break;
    case 15:	
      type = 'Heavy rain';
      icon = 'https://i.imgur.com/s2Vkovq.png';
      break;
    case 16:	
      type = 'Sleet shower (night)';
      icon = 'https://i.imgur.com/CoD0Vu6.png';
      break;
    case 17:	
      type = 'Sleet shower (day)';
      icon = 'https://i.imgur.com/RwoRYjG.png';
      break;
    case 18:	
      type = 'Sleet';
      icon = 'https://i.imgur.com/gd7E4tj.png';
      break;
    case 19:	
      type = 'Hail shower (night)';
      icon = 'https://i.imgur.com/lDEyPyn.png';
      break;
    case 20:	
      type = 'Hail shower (day)';
      icon = 'https://i.imgur.com/VQjWn6I.png';
      break;
    case 21:	
      type = 'Hail';
      icon = 'https://i.imgur.com/vfCzeMb.png';
      break;
    case 22:	
      type = 'Light snow shower (night)';
      icon = 'https://i.imgur.com/1sIzTcd.png';
      break;
    case 23:	
      type = 'Light snow shower (day)';
      icon = 'https://i.imgur.com/d5a0pUW.png';
      break;
    case 24:	
      type = 'Light snow';
      icon = 'https://i.imgur.com/6de1E9M.png';
      break;
    case 25:	
      type = 'Heavy snow shower (night)';
      icon = 'https://i.imgur.com/Ci4Y6B1.png';
      break;
    case 26:	
      type = 'Heavy snow shower (day)';
      icon = 'https://i.imgur.com/NeEAaiX.png';
      break;
    case 27:	
      type = 'Heavy snow';
      icon = 'https://i.imgur.com/da6PBXs.png';
      break;
    case 28:	
      type = 'Thunder shower (night)';
      icon = 'https://i.imgur.com/FtyMU0K.png';
      break;
    case 29:	
      type = 'Thunder shower (day)';
      icon = 'https://i.imgur.com/qmelSLU.png';
      break;
    case 30:	
      type = 'Thunder';
      icon = 'https://i.imgur.com/TCRGerb.png';
      break;
  }
  
  return {'type': type, 'icon': icon};
}

function noWeatherLogic() {

  Logger.log('noWeatherLogic')
  var date = new Date();
  var nextFriday = new Date(date.getTime());
  
  nextFriday.setDate(date.getDate() + (7 + 5 - date.getDay()) % 7);
  
  var summary;
  
  text = "Weather forecast unavailable! Please use your human senses to determine outdoor playability, " +
    "and vote for suitable times accordingly." 
  
  times = ['12:00 - 13:30', '13:00 - 14:30', '14:00 - 15:30', '15:00 - 16:30', '16:00 - 17:30'];
  
  var summary = {'outside': null, 'text': text, 'times':times, 'day': "Friday", 'icon': null,
                 'weather': {
                   'simpleday': {
                     'date': {
                       'day': Utilities.formatDate(nextFriday, "Europe/London", "dd"),
                       'monthname': Utilities.formatDate(nextFriday, "Europe/London", "MMMM")
                     }
                   }
                 }
                }
  
  return summary
}



function getSunset() {
 
  var url = "https://api.sunrise-sunset.org/json?lat=51.712579&lng=-0.211286&formatted=0"
  
  var response = UrlFetchApp.fetch(url);
  var json = response.getContentText();
  
  var output = JSON.parse(json);
  
  if(output.results.sunset == null)
    return null;
  
  var date = new Date(output.results.sunset);
  
  var sunset = date.getHours() + (date.getMinutes() / 60);
    
  Logger.log("Sunset at " + sunset);
  
  return sunset;
}





//deprecated API
function getWundergroundWeather() {
  
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


function outdoorLogic_deprecated(weather, day) {
  
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
  
  
  var summary = {'outside': false, 'nogo':nogo, 'text': text, 'times':times, 'day':txt_day.title,
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
  
  
