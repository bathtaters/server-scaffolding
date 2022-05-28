/* Table reset confirmation */
$( 'input#actionReset' ).click(function (ev) {
  if(!window.confirm('Are you sure you want to erase the entire table?')) ev.preventDefault()
})

/* Select row for editing */
$( 'tr.tableRow' ).click(function () {
  $(this).children('td').each(function (idx, cell) {
    console.log($(this).attr('data-label'))
    $( '#'+$(this).attr('data-label') ).val($(this).text())
  })
})