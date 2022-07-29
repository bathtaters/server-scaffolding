/// <reference path="./jquery-3.6.0.min.js" />

/* Table reset confirmation */
$( 'input#actionReset' ).on('click', function(ev) {
  if(!window.confirm('Are you sure you want to erase the entire table?')) {
    ev.preventDefault();
  }
});

/* Reset hidden fields on 'clear' */
$( 'input#clearForm' ).on('click', function() { $( 'input[type="hidden"]' ).val(""); });

/* Select buttons on <ENTER> */
$( 'form#editForm' ).on('keydown', function(ev) {
  if ((ev.which === 13 || ev.key === 'Enter')
    && !['button','submit','reset'].includes($(ev.target).attr('type'))
  ) {
    ev.preventDefault();
    $( '#actionSearch' ).trigger('focus');
  }
});

/* Select row for editing */
$( 'tr.tableRow' ).on('click', function() {
  $(this).children('td').each(function() {
      var elem = $( '#'+$(this).attr('data-key') );
      var val = $(this).text();
      
      if (elem.attr('type') === 'checkbox') {
        elem.prop('checked', val.toLowerCase() !== 'false' && val != false);
      } else {
        elem.val(val);
      }
      return true;
  });
});


/* Enable/Disable search restrictions */
$(function() {
  $( 'input[min]' ).each(function() {
    var min = $(this).attr('min');
    if (+min > 0) { $(this).attr('data-min', min); }
  });
  $( 'input[minLength]' ).each(function() {
    var min = $(this).attr('minLength');
    if (+min > 0) { $(this).attr('data-minLength', min); }
  });

  if ($( 'input#searchMode' ).prop('checked')) { $.setSearch(true); }
  if($( 'input#forceSearch' ).val()) { $.setSearch(true); }
});

$.setSearch = function(enable) {
  $( '#primary-key input' ).attr('readonly', !enable);
  $( 'input#swapId' ).attr('disabled', enable);
  $( 'input#actionSwap' ).attr('disabled', enable);
  $( 'input[type="submit"]:not(#actionSearch)' ).attr('disabled', enable);
  $( 'input[data-min]' ).each(function() { $(this).attr('min', !enable && $(this).attr('data-min')); });
  $( 'input[data-minLength]' ).each(function() { $(this).attr('minLength', !enable && $(this).attr('data-minLength')); });
}

$( 'input#searchMode' ).on('input', function() {
  if ($(this).prop('checked')) { $.setSearch(true); }
  else { $.setSearch(false); }
});


/* Clear button logic */
$( function() {
  $( 'textarea:not(.ignoreClear), input[type="text"]:not(.ignoreClear), input[type="number"]:not(.ignoreClear)' ).each(function() {
    $(this).attr('data-default' , $(this).val())
  });
  $( 'input[type="checkbox"]:not(.ignoreClear)' ).each(function() {
    $(this).attr('data-default', $(this).prop('checked'))
  });
})

$.resetInputs = function(clear) {
  $( 'textarea:not(.ignoreClear), input[type="text"]:not(.ignoreClear), input[type="number"]:not(.ignoreClear)' ).each(function() {
    $(this).val(clear ? '' : $(this).attr('data-default'));
  });
  $( 'input[type="checkbox"]:not(.ignoreClear)' ).each(function() {
    $(this).prop('checked', !clear && $(this).attr('data-default') !== 'false');
  });
}

$( 'input#clearForm' ).on('click', function(ev) {
  ev.preventDefault()
  if ($( 'input#searchMode' ).prop('checked')) {
    $.setSearch(true);
    $.resetInputs(true);
  } else {
    $.setSearch(false);
    $.resetInputs(false);
  }
});


/* Swap two IDs */
$( '#actionSwap' ).on('click', function() {
  var sendData = { swap: $( 'input#swapId' ).val() };
  var idElem = $( '#primary-key input' );
  var idVal = idElem.val();
  if (!idVal || !sendData.swap) { return window.alert('Must enter Main ID & Swap IDs to swap.'); }
  sendData[idElem.attr('id')] = idVal;

  $.ajax({
    type:    "POST",
    url:     $( 'form#editForm' ).attr('action').replace('/form', '/swap'),
    data:    sendData,
    success: function(data) {
      if (!data.success) { window.alert('Error performing swap: '+(data.error || 'Unknown error')); }
      window.location.reload();
    },
    error:   function(jqXHR, textStatus, errorThrown) {
      window.alert("Error performing swap!\n" + (
        (jqXHR.responseJSON && jqXHR.responseJSON.error) || errorThrown + " [" + textStatus + "]"
      ));
      window.location.reload();
    }
  });
});