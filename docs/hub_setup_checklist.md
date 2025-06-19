# Hub Setup Checklist

This checklist outlines the recommended steps when deploying a new print hub.

1. **Prepare hardware**

   - Assemble printers and plug in cameras.
   - Connect the Raspberry Pi for each printer.
   - Ensure ethernet and power are available for all devices.

2. **Flash SD cards**

   - Use the provided OS image from `sd-images/<version>.img`.
   - Run `sudo dd if=sd-images/<version>.img of=/dev/sdX bs=4M status=progress` to write each card.
   - Insert the SD card into the Raspberry Pi and boot it.

3. **Assign hub details**

   - Create the hub via the admin dashboard or `backend/scripts/register-hub.js`.
   - Note the generated hub ID for later use.
   - Set the hub location and operator from the dashboard.

4. **Auto-register printers**

   - On each Pi run `node register-printer.js --hub <id> --serial <serial>`.
   - The script calls the API and adds the printer to monitoring.

5. **Verify connectivity**

   - Run `node verify-printers.js --hub <id>` to check printer APIs and camera feeds.
   - Resolve any connectivity issues before proceeding.

6. **Perform test prints**

   - Send a small calibration file to each printer.
   - Inspect the result and confirm the camera stream is clear.

7. **Mark hub live**
   - Once all printers succeed, update the hub status in the dashboard.
   - The hub will now receive production jobs.
