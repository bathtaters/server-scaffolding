/// <reference path="./jquery-3.6.0.min.js" />

/* Table reset confirmation */
$( 'input#_actionReset' ).on('click', function(ev) {
  if(!window.confirm('Are you sure you want to erase the entire table?')) {
    ev.preventDefault();
  }
});

/* Select buttons on <ENTER> */
$( 'form#editForm' ).on('keydown', function(ev) {
  if ((ev.which === 13 || ev.key === 'Enter')
    && !['button','submit','reset'].includes($(ev.target).attr('type'))
  ) {
    ev.preventDefault();
    $( '#_actionSearch' ).trigger('focus');
  }
});

/* Select row for editing */
$( 'tr.tableRow' ).on('click', function() {
  $(this).children('td').each(function() {
      var elem = $( '#'+$(this).attr('data-key') );
      var val = $(this).text();
      
      switch (elem.attr('type')) {
        case 'checkbox':
          elem.prop('checked', val.toLowerCase() !== 'false' && val != false);
          break;
        case 'date':
        case 'time':
        case 'datetime-local':
          elem.val(val && new Date(val + ' Z').toJSON().substring(0,16));
          break;
        default:
          elem.val(val);
      }
      return true;
  });
});


/* Enable/Disable search restrictions */
$(function() {
  $( 'input[readonly] ').each(function() {
    $(this).attr('data-locked', true);
  });

  $( 'input[min]' ).each(function() {
    var min = $(this).attr('min');
    if (+min > 0) { $(this).attr('data-min', min); }
  });
  $( 'input[minLength]' ).each(function() {
    var min = $(this).attr('minLength');
    if (+min > 0) { $(this).attr('data-minLength', min); }
  });

  if($( 'input#_searchMode' ).prop('checked')) { $.setSearch(true); }
  if($( 'input#forceSearch' ).val()) { $.setSearch(true); }
});

$.setSearch = function(enable) {
  $( '[data-locked]' ).attr('readonly', !enable);
  $( 'input#swapId' ).attr('disabled', enable);
  $( 'input#_actionSwap' ).attr('disabled', enable);
  $( 'input[type="submit"]:not(#_actionSearch)' ).attr('disabled', enable);
  $( 'input[data-min]' ).each(function() { $(this).attr('min', !enable && $(this).attr('data-min')); });
  $( 'input[data-minLength]' ).each(function() { $(this).attr('minLength', !enable && $(this).attr('data-minLength')); });
}

$( 'input#_searchMode' ).on('input', function() {
  if ($(this).prop('checked')) { $.setSearch(true); }
  else { $.setSearch(false); }
});


/* Clear button logic */
$( function() {
  $( 'textarea:not(.ignoreClear), input[type="text"]:not(.ignoreClear), input[type="number"]:not(.ignoreClear), '+
    'input[type="date"]:not(.ignoreClear), input[type="time"]:not(.ignoreClear), input[type="datetime-local"]:not(.ignoreClear)' ).each(function() {
    $(this).attr('data-default' , $(this).val())
  });
  $( 'input[type="checkbox"]:not(.ignoreClear)' ).each(function() {
    $(this).attr('data-default', $(this).prop('checked'))
  });
})

$.resetInputs = function(clear) {
  $( 'textarea:not(.ignoreClear), input[type="text"]:not(.ignoreClear), input[type="number"]:not(.ignoreClear), '+
    'input[type="date"]:not(.ignoreClear), input[type="time"]:not(.ignoreClear), input[type="datetime-local"]:not(.ignoreClear)' ).each(function() {
    $(this).val(clear ? '' : $(this).attr('data-default'));
  });
  $( 'input[type="checkbox"]:not(.ignoreClear)' ).each(function() {
    $(this).prop('checked', !clear && $(this).attr('data-default') !== 'false');
  });
}

$( 'input#clearForm' ).on('click', function(ev) {
  ev.preventDefault()
  if ($( 'input#_searchMode' ).prop('checked')) {
    $.setSearch(true);
    $.resetInputs(true);
  } else {
    $.setSearch(false);
    $.resetInputs(false);
  }
});


/* Swap two IDs */
$( '#_actionSwap' ).on('click', function() {
  var sendData = { swap: $( 'input#swapId' ).val() };
  var idElem = $( '#primary-key input' );
  var idVal = idElem.val();
  if (!idVal || !sendData.swap) { return window.alert('Must enter Main ID & Swap IDs to swap.'); }
  sendData[idElem.attr('id')] = idVal;
  sendData['_csrf'] = $( '#_csrf' ).val();

  $.ajax({
    type:    "POST",
    url:     $(this).attr('formaction'),
    data:    sendData,
    success: function(data) {
      if (!data.success) { window.alert('Error performing swap: '+((data.error && data.error.message) || data.error || 'Unknown error')); }
      window.location.reload();
    },
    error:   function(jqXHR, textStatus, errorThrown) {
      window.alert("Error performing swap!\n" + (
        (jqXHR.responseJSON && jqXHR.responseJSON.error && 
          (jqXHR.responseJSON.error.message || jqXHR.responseJSON.error)
        ) || errorThrown + " [" + textStatus + "]"
      ));
      window.location.reload();
    }
  });
});