<p align="center">
  <a href="#">
    <img src="./.github/orb.gif" height="180" alt="Orb Preview">
  </a>
</p>

<h1 align="center">Voice Orb</h1>

<br>
<p align="center">
  <strong>Orb</strong> <i>noun</i> <sup>tech</sup>
  <br>
  a circular graphical user interface element with an animated spherical texture 
</p>
<br>

``` html
<html>
  <head>
    <script src="https://cdn.jsdelivr.net/gh/webfuse-com/voice-orb/voice-orb.js"></script>
  </head>
  <body>
    <voice-orb id="orb" size="500"></voice-orb>
  </body>
</html>
```

``` js
const orb = document.getElementById("orb");

orb
  .update({
    colors: [
      [0, 200, 255],
      [0, 100, 255],
      [0, 255, 180]
    ],
    transitionTime: 2000,
    morphSpeed: 0.5,
    randomness: 0.75,
    rotationSpeed: 0.8
  });
```