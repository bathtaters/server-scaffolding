/// <reference path="./jquery-3.6.0.min.js" />

/* Table reset confirmation */
$( 'input#actionReset' ).on('click', function(ev) {
  if(!window.confirm('WARNING! This will remove all users and log you out, are you sure you want to do this?')) {
    ev.preventDefault();
  }
});

/* Reset hidden fields on 'clear' */
$( 'input#clearForm' ).on('click', function() { $( 'input[type="hidden"]' ).val(""); });

/* Select row for editing */
$( 'tr.tableRow' ).on('click', function() {
  $( 'input#'+$(this).attr('data-key') ).val( $(this).attr('data-val') );

  $(this).children('td').each(function() {
    var key = '#'+$(this).attr('data-key');
    
    if (key === '#password' || key === '#confirm') { return true; }

    if (key !== '#access') {
      $( key ).val($(this).text());
      return true;
    }

    $( 'input.accessChecks' ).prop('checked', false);

    $(this).text().split('/').forEach(function(accessType) {
      $( 'input#'+accessType ).prop('checked', true);
    });

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
          jqXHR.responseJSON.error || errorThrown + " [" + textStatus + "]"
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

  function enableSearch() {
    $( 'input#token' ).attr('readonly', false);
    $( 'input#password' ).attr('disabled', true);
    $( 'input#confirm' ).attr('disabled', true);
    $( 'input[type="submit"]:not(#actionSearch)' ).attr('disabled', true);
    $( 'input[data-min]' ).each(function() { $(this).attr('min', false); });
    $( 'input[data-minLength]' ).each(function() { $(this).attr('minLength', false); });
  }

  function disableSearch() {
    $( 'input#token' ).attr('readonly', true);
    $( 'input#password' ).attr('disabled', false);
    $( 'input#confirm' ).attr('disabled', false);
    $( 'input[type="submit"]' ).attr('disabled', false);
    $( 'input[data-min]' ).each(function() { $(this).attr('min', $(this).attr('data-min')); });
    $( 'input[data-minLength]' ).each(function() { $(this).attr('minLength', $(this).attr('data-minLength')); });
  }

  if ($( 'input#searchMode' ).prop('checked')) { enableSearch(); }

  $( 'input#clearForm' ).on('click', function() { disableSearch(); });

  $( 'input#searchMode' ).on('input', function() {
    if ($(this).prop('checked')) { enableSearch(); }
    else { disableSearch(); }
  });

});