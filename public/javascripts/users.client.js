/// <reference path="./jquery-3.6.0.min.js" />

/* Table reset confirmation */
$( 'input#actionReset' ).on('click', function(ev) {
  if(!window.confirm('WARNING! This will remove all users and log you out, are you sure you want to do this?')) {
    ev.preventDefault();
  }
});

/* Reset hidden fields on 'clear' */
$( 'input#clearForm' ).on('click', function() { $( 'input[type="hidden"]' ).val(""); });

/* Copy API Key to Clipboard (Hide if no Clipboard API) */
$( function() { if (!navigator.clipboard) { $( 'a#copyToken' ).addClass('hidden'); } } );
$( 'a#copyToken' ).on('click', function() {
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

    if (key !== 'access' && key !== 'models') {
      var elem = $('#' + key);
      var val = $(this).text();
      
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
    var checks = $(this).text().split(', ')
    
    // Grouped checkboxes
    if (key !== 'models') {
      checks.forEach(function(accessType) {
        $( 'input.'+key+'Checks#'+accessType ).prop('checked', true);
      });
      return;
    }

    // Table checkboxes
    var i = checks.length;
    while (i-- > 0) {
      var check = checks[i].match(/^([^[\s]+)\s*\[([^\]]+)\]$/);
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
$( 'input.accessChecks' ).on('input', function() {
  if (!$(this).prop('checked')) return;

  if ($(this).attr('id') === "none") {
    $( 'input.accessChecks' ).not( '#none' ).prop('checked', false);
  } else {
    $( 'input#none' ).prop('checked', false);
  }
});
$( 'input.modelsChecks' ).on('input', function() {
  if (!$(this).prop('checked')) return;

  var row = $(this).attr('data-row')
  if ($(this).attr('data-col') === "none") {
    $( 'input.modelsChecks[data-row="'+row+'"]' ).not(this).prop('checked', false);
  } else {
    $( 'input.modelsChecks[data-row="'+row+'"][data-col="none"]' ).prop('checked', false);
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
$( '#actionRegen' ).click(function() {
  var idElem = $( '#primary-key input' );
  var idVal = idElem.val();
  if (!idVal) return window.alert('Select a row to update...');

  var sendData = {};
  sendData[idElem.attr('id')] = idVal;

  $.ajax({
    type:    "POST",
    url:     $( 'form#editForm' ).attr('action').replace('/form', '/regenToken'),
    data:    sendData,
    success: function(data) {
        if (!data.success) { window.alert('Error regenerating API ID: '+(data.error || 'Unknown error')); }
        else { window.location.reload(); }
      },
    error:   function(jqXHR, textStatus, errorThrown) {
        window.alert("Error regenerating API ID!\n" + (
          (jqXHR.responseJSON && jqXHR.responseJSON.error) || errorThrown + " [" + textStatus + "]"
        ));
    }
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
  if (enable) $( 'input#expandModels' ).prop('checked', false)
  $( 'input#token' ).attr('readonly', !enable);
  $( 'input#password' ).attr('disabled', enable);
  $( 'input#confirm' ).attr('disabled', enable);
  $( 'input#expandModels' ).attr('disabled', enable);
  $( 'label[for="expandModels"]' ).attr('disabled', enable);
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
})//*/

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
