document.addEventListener('DOMContentLoaded', () => {

  // Get all "navbar-burger" elements
  const $navbarBurgers = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'), 0);

  // Check if there are any navbar burgers
  if ($navbarBurgers.length > 0) {

    // Add a click event on each of them
    $navbarBurgers.forEach(el => {
      el.addEventListener('click', () => {

        // Get the target from the "data-target" attribute
        const target = el.dataset.target;
        const $target = document.getElementById(target);

        // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
        el.classList.toggle('is-active');
        $target.classList.toggle('is-active');

      });
    });
  }

});

$('.release-button').click(function () {
  var target = $(this).data('target');
  $('html').addClass('is-clipped');
  $(target).addClass('is-active');
});

$('.modal-background, .modal-close').click(function () {
  $('html').removeClass('is-clipped');
  $(this).parent().removeClass('is-active');
});

// Wrap every table and make them scrollable
document.addEventListener('DOMContentLoaded', () => {
  $("table").wrap("<div class=\"table-container\"></div>")
})

$('.dropdown').click(function () {
  $('.dropdown').toggleClass("is-active")
});
