# immersive-controls

https://www.npmjs.com/package/immersive-controls

NPM package for immersive controls in THREE.js applications.

- 📱 Mobile
  - 👆 Touch
  - 🌀 Gyroscope
- 💻 Computer
  - 🖱️ Mouse


There are 2 types of controls:
- Manual: 👆 Touch, 🖱️ Mouse
- Immersive: 🌀 Gyroscope

The immersive control controlling the camera is divided further in 2 categories:
- TrueView: In this mode, the camera angles within the 3D scene precisely replicate the rotation of the mobile phone's camera in real life. TrueView ensures a direct, one-to-one mapping between the virtual and physical worlds, delivering an authentic and lifelike experience.
- Flexible: Unlike TrueView, the Flexible mode allows the camera angles within the 3D scene to vary based on a multitude of factors. These factors introduce dynamic variability and decoupled physical and digital cameras. Thus, the digital and physical cameras might deviate due to these factors; for instance, the 3D scene's camera could rotate at a different speed than its real-life counterpart. For instance: a 360° rotation in real life might translate into a 1080° rotation in the 3D environment.
