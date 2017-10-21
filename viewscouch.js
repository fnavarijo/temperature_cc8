// view 'info'
function (doc) {
  var values, data;
  data = {
     tag: doc.tag,
     type: doc.type
   };
  emit(doc.id_hardware, data);
}

// view 'search'
function (doc) {
    var values;
    var data = {};
    data[doc.date] = {
       rotation: doc.rotation
     };
    emit(doc.id_hardware, data);
  }