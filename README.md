# Installation (Raspberry Pi 2)

In order to get piface-node module to install:

+ Cloned `libpifacedigital`, ran `make` and `make install`
+ Cloned `libmcp23s17`, ran `make`, then copied `mcp23s17.h` to `/usr/local/include/libmcp23s17/` and copied `libmcp23s17.a` to `usr/local/lib/`

# Configuation of Cables

Here is the cable config for the raspberry pi:

+ STF: 0, // Forward Rotation Start, cable 5
+ STR: 1, // Reverse Rotation Start 6 
+ RL: 5, // Low cable: 1
+ RM: 6, // Medium cable 2
+ RH: 7, // High, cable 3
+ PC: 3 // Common Ground, cable 4

Which, translated to Human, means:

+ Relay 0 on the RPi gets cable 5 on the right most relay terminal
+ Relay 1 on the RPi gets cable 6 on the right most relay terminal
+ Relay 5 on the RPi gets cable 1 on the right most relay terminal
+ Relay 6 on the RPi gets cable 2 on the right most relay terminal
+ Relay 7 on the RPi gets cable 3 on the right most relay terminal
+ Relay 3 on the RPi gets cable 4 on the center most relay terminal
