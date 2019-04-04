 // MIT License
 //
 // Copyright (c) 2019 Johannes Vockeroth
 //
 // Permission is hereby granted, free of charge, to any person obtaining a copy
 // of this software and associated documentation files (the "Software"), to deal
 // in the Software without restriction, including without limitation the rights
 // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 // copies of the Software, and to permit persons to whom the Software is
 // furnished to do so, subject to the following conditions:
 //
 // The above copyright notice and this permission notice shall be included in all
 // copies or substantial portions of the Software.
 //
 // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 // OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 // SOFTWARE. *

if (beaconlocate == null || typeof(beaconlocate) != "object") {
/*	create new nextbike namespace, if not exists.
*/
	var beaconlocate = new Object();
}

/* Convert an https://www.w3.org/TR/geolocation-API/#position object to an iBeacon object,
 * that contains 'uuid' as RFC 4122 UUID string representation, 'major' and 'minor' as number
 * The position coordinates can have an additional 'story' attribute with values 0 - 3
 * input: {coords : {latitude: 51.123456, longitude: -120.987654, story: 2}}
 * output: {uuid: 'BE10CA7E-C001-F00D-10CA-7E0232057837', major: 28889, minor: 51110}
 */
beaconlocate.convertPositionToIBeacon = function(position) {
  base = 'BE10CA7E-C001-F00D-10CA-7E';
  
  pos = {
 		lat : position.coords.latitude,
    lng : position.coords.longitude,
    story : 0
  }
  if (typeof position.coords.story !== 'undefined') {
  	pos.story = Math.max(0, Math.min(3, position.coords.story));
  }
  
  // determine euclidian quadrant
  // 2 | 1
  // --+--
  // 3 | 4
  quadrant = pos.lat >= 0 ? (pos.lng >= 0 ? 1 : 2) : (pos.lng < 0 ? 3 : 4);
  pos.lat = Math.abs(pos.lat);
  pos.lng = Math.abs(pos.lng);
  
  // convert decimal degrees to degrees. minutes, seconds
  lat.degs = Math.floor(pos.lat),
  lat.mins = Math.floor((pos.lat - lat.degs) * 60);
  lat.secs = (pos.lat - lat.degs - lat.mins / 60) * 3600;
  lng.degs = Math.floor(pos.lng),
  lng.mins = Math.floor((pos.lng - lng.degs) * 60);
  lng.secs = (pos.lng - lng.degs - lng.mins / 60) * 3600;
  
  // devide in 5-minute boxes with up to 300 seconds each
  lat.secs += (lat.mins % 5) * 60;
  lat.mins = Math.floor(lat.mins / 5) * 5;
  lng.secs += (lng.mins % 5) * 60;
  lng.mins = Math.floor(lng.mins / 5) * 5;
  
  uuidparts = [
  	'0' + quadrant,
    lat.degs.toString(16).padStart(2, '0').toUpperCase(),
    lat.mins.toString(16).padStart(2, '0').toUpperCase(),
    lng.degs.toString(16).padStart(2, '0').toUpperCase(),
    lng.mins.toString(16).padStart(2, '0').toUpperCase()
  ];
  
  iBeacon = {
  	uuid: base + uuidparts.join(''),
    major: Math.floor(lat.secs / 0.01) << 1,
    minor: Math.floor(lng.secs / 0.01) << 1
  }
  
  // Add story as 2x 1 bit (least significant in major / minor)
  if (pos.story >= 2) {
  	iBeacon.major += 0x1;
  }
  if (pos.story % 2) {
  	iBeacon.minor += 0x1;
  }

  return iBeacon;
}

/* Convert an iBeacon object to a simplified https://www.w3.org/TR/geolocation-API/#position object,
 * that contains 'latitude', 'longitude' and an additional 'story' attribute with values 0 - 3
 * input: {uuid: 'BE10CA7E-C001-F00D-10CA-7E0232057837', major: 28889, minor: 51110}
 * output: {coords : {latitude: 50.12345556, longitude: -120.98765278, story: 2}}
 */
beaconlocate.convertIBeaconToPosition = function(iBeacon) {
  uuid = iBeacon.uuid.split(':').join('');
	lat = {
  	degs : parseInt('0x' + uuid.substr(24, 2)),
  	mins : parseInt('0x' + uuid.substr(26, 2)),
    secs : (iBeacon.major >> 1) * 0.01
  };
	lng = {
  	degs : parseInt('0x' + uuid.substr(28, 2)),
  	mins : parseInt('0x' + uuid.substr(30, 2)),
    secs : (iBeacon.minor >> 1) * 0.01
  };
  position = {
    coords : {
      latitude: lat.degs + lat.mins / 60 + lat.secs / 3600,
      longitude: lng.degs + lng.mins / 60 + lng.secs / 3600,
      story: 0
    }
  }
	quadrant = uuid.substr(23, 1);
  if (quadrant > 2) {
  	position.coords.latitude *= -1;
  }
  if (quadrant == 2 || quadrant == 3) {
  	position.coords.longitude *= -1;
  }
  position.coords.latitude = Math.round(position.coords.latitude * 100000000) / 100000000;
  position.coords.longitude = Math.round(position.coords.longitude * 100000000) / 100000000;
  position.coords.story = (iBeacon.major & 0x1 ? 2 : 0) + (iBeacon.minor & 0x1 ? 1 : 0);

  return position;
}
