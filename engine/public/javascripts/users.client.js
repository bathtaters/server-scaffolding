/// <reference path="./jquery-3.6.0.min.js" />

/* Table reset confirmation */
$( 'input#_actionReset' ).on('click', function(ev) {
  if(!window.confirm('WARNING! This will remove all users and log you out, are you sure you want to do this?')) {
    ev.preventDefault();
  }
});

/* Reset ID & CopyToken on 'clear' */
$( 'input#clearForm' ).on('click', function() {
  $( 'input#id' ).val("");
  $( '#tokenCopy' ).attr('disabled', true);
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

/* Copy API Key to Clipboard (Hide if no Clipboard API) */
$( function() {
  $( '#tokenCopy' ).attr('disabled', true);
  if (!navigator.clipboard) { $( '#tokenCopy' ).addClass('hidden'); }
});

$( '#tokenCopy' ).on('click', function() {
  if (!navigator.clipboard) { return window.alert('Browser does not support copying to clipboard'); }
  
  var token = $( 'input#token' ).val();
  if (!token) { return; }

  navigator.clipboard.writeText(token).then(
    function() { window.alert('API Key copied to clipboard'); }, 
    function() { window.alert('Error or browser does not support copying to clipboard'); }
  );
});

/* Select row for editing */
$( 'tr.tableRow' ).on('click', function() {
  $( 'input#'+$(this).attr('data-key') ).val( $(this).attr('data-val') );

  $(this).children('td').each(function() {
    var key = $(this).attr('data-key');
    
    if (key === 'password') {
      $( '#password' ).text('')
      $( '#confirm' ).text('')
      return true;
    }

    if (key !== 'role' && key !== 'access') {
      var elem = $('#' + key);
      var val = $(this).text();

      if (key === 'token') {
        $( '#tokenCopy' ).attr('disabled', false);
      }
      
      if (elem.attr('type') === 'checkbox') {
        // Solo checkboxes
        elem.prop('checked', val.toLowerCase() !== 'false' && val != false);
      } else {
        // Other input
        elem.val(val);
      }
      return true;
    }

    $( 'input.'+key+'Checks' ).prop('checked', false);
    
    // Grouped checkboxes
    if (key !== 'access') {
      var checks = $(this).text().split('/')
      checks.forEach(function(roleType) {
        $( 'input.'+key+'Checks#'+roleType ).prop('checked', true);
      });
      return;
    }

    // Table checkboxes
    var checks = $(this).text().split(', ')
    var i = checks.length, tableRegex = /^\s*([^\s:]+):\s*\[([^\]]+)\]\s*$/;
    while (i-- > 0) {
      var check = checks[i].match(tableRegex);
      if (!check || !check[1]) { continue; }

      var anyChecked = false;

      if (check[2]) {
        $( 'input.'+key+'Checks[data-row="'+check[1]+'"]' ).each(function() {
          if (check[2].indexOf($(this).attr('data-col').charAt(0)) !== -1) {
            $(this).prop('checked', true);
            anyChecked = true;
          }
        });
      }

      if (!anyChecked) { $( 'input.'+key+'Checks#'+check[1]+'-none' ).prop('checked', true); }
    }
        
  });
});

/* Auto-select checkboxes */
$( 'input.roleChecks' ).on('input', function() {
  if (!$(this).prop('checked')) return;

  if ($(this).attr('id') === "none") {
    $( 'input.roleChecks' ).not( '#none' ).prop('checked', false);
  } else {
    $( 'input#none' ).prop('checked', false);
  }
});
$( 'input.accessChecks' ).on('input', function() {
  if (!$(this).prop('checked')) return;

  var row = $(this).attr('data-row')
  if ($(this).attr('data-col') === "none") {
    $( 'input.accessChecks[data-row="'+row+'"]' ).not(this).prop('checked', false);
  } else {
    $( 'input.accessChecks[data-row="'+row+'"][data-col="none"]' ).prop('checked', false);
  }
});

/* Update password/confirm fields on each change */
$( 'input#clearForm' ).on('click', function() { $( 'input#confirm' ).removeClass('invalid').attr('required', false); });
$( 'input#confirm, input#password' ).on('input', function() {
  var confirm = $( 'input#confirm' );
  var confirmVal = confirm.val();
  var pwordVal = $( 'input#password' ).val();

  confirm.attr('required', !!pwordVal);
  
  if (!confirmVal || confirmVal === pwordVal) {
    return confirm.removeClass('invalid');
  }
  confirm.addClass('invalid');
});

/* Regenerate API ID */
$( '#tokenRegen' ).on('click', function() {
  var CSRF = window.LOCALS.formKeys.csrf;

  var idElem = $( '#primary-key input' );
  var idVal = idElem.val();
  if (!idVal) return window.alert('Select a row to update...');

  var sendData = {};
  sendData[idElem.attr('id')] = idVal;
  sendData[CSRF] = $( '#'+CSRF ).val();

  $.ajax({
    type:    "POST",
    url:     $(this).attr('formaction'),
    data:    sendData,
    success: function(data) {
        if (!data.changed) { window.alert('Error regenerating API ID: '+((data.error && data.error.message) || data.error || 'Unknown error')); }
        else { window.location.reload(); }
      },
    error:   function(jqXHR, textStatus, errorThrown) {
        window.alert("Error regenerating API ID!\n" + (
          (jqXHR.responseJSON && jqXHR.responseJSON.error && 
            (jqXHR.responseJSON.error.message || jqXHR.responseJSON.error)
          ) || errorThrown + " [" + textStatus + "]"
        ));
    }
  });
});


/* Enable/Disable search restrictions */
$(function() {
  var SEARCH = window.LOCALS.formKeys.search;

  $( 'input[min]' ).each(function() {
    var min = $(this).attr('min');
    if (+min > 0) { $(this).attr('data-min', min); }
  });
  $( 'input[minLength]' ).each(function() {
    var min = $(this).attr('minLength');
    if (+min > 0) { $(this).attr('data-minLength', min); }
  });

  if ($( 'input#'+SEARCH ).prop('checked')) { $.setSearch(true); }
  if ($( 'input#forceSearch' ).val())       { $.setSearch(true); }

  $( 'input#'+SEARCH ).on('input', function() {
    if ($(this).prop('checked')) { $.setSearch(true); }
    else { $.setSearch(false); }
  });
});

$.setSearch = function(enable) {
  if (enable) $( 'input#expandAccess' ).prop('checked', false)
  $( 'input#token' ).attr('readonly', !enable);
  $( 'input#password' ).attr('disabled', enable);
  $( 'input#confirm' ).attr('disabled', enable);
  $( 'input#expandAccess' ).attr('disabled', enable);
  $( 'label[for="expandAccess"]' ).attr('disabled', enable);
  $( 'input[type="submit"]:not(#_actionSearch)' ).attr('disabled', enable);
  $( 'input[data-min]' ).each(function() { $(this).attr('min', !enable && $(this).attr('data-min')); });
  $( 'input[data-minLength]' ).each(function() { $(this).attr('minLength', !enable && $(this).attr('data-minLength')); });
}


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
  var SEARCH = window.LOCALS.formKeys.search;

  ev.preventDefault()
  if ($( 'input#'+SEARCH ).prop('checked')) {
    $.setSearch(true);
    $.resetInputs(true);
  } else {
    $.setSearch(false);
    $.resetInputs(false);
  }
});
