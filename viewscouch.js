// view 'info' in HARDWARE
function (doc) {
  var values, data;
  data = {
     tag: doc.tag,
     type: doc.type
   };
  emit(doc.id_hardware, data);
}

// view 'search' in DATA
function (doc) {
  var values;
  var data = {};
  data[doc.date] = {
     sensor: doc.sensor,
     freq: doc.freq
   };
  emit(doc.id_hardware, data);
}