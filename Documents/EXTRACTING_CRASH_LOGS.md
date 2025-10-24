# How to Extract Crash Logs from iPhone

## Method 1: Via Xcode (Most Detailed) ⭐ Recommended

This gives you the most detailed logs including our debug statements.

### Steps:

1. **Connect your iPhone to your Mac** via USB cable

2. **Open Xcode**

3. **Go to Window → Devices and Simulators** (or press `Cmd + Shift + 2`)

4. **Select your iPhone** from the left sidebar

5. **Click "View Device Logs"** button (bottom left)

6. **Find the PuttIQ crash:**
   - Look for recent crashes (sorted by date/time)
   - Filter by "PuttIQ" in the search box
   - The crash will have a timestamp matching when it crashed

7. **Export the crash log:**
   - Select the crash
   - Right-click → **Export Log**
   - Save as `crash-log-[date].crash`

8. **Share the file** - You can send it to me or open it in a text editor

---

## Method 2: Via Settings App (Quick)

Built into iOS, no Mac needed!

### Steps:

1. **Open Settings** on your iPhone

2. **Navigate to:**
   ```
   Settings → Privacy & Security → Analytics & Improvements → Analytics Data
   ```

3. **Scroll to find PuttIQ crashes:**
   - Look for files starting with `PuttIQ`
   - Format: `PuttIQ-2025-10-24-123456.ips`
   - These are sorted chronologically

4. **Tap on the crash file** you want to view

5. **Share the crash log:**
   - Tap the **Share icon** (top right)
   - Choose **AirDrop** (to Mac), **Mail**, or **Save to Files**

6. **Send me the file** or paste contents here

---

## Method 3: Via Console.app (Live Debugging)

See crashes as they happen in real-time!

### Steps:

1. **Connect iPhone to Mac** via USB

2. **Open Console.app** on your Mac
   - Location: `/Applications/Utilities/Console.app`
   - Or: Spotlight search "Console"

3. **Select your iPhone** from the left sidebar (under "Devices")

4. **Filter the logs:**
   - In the search box (top right), type: `PuttIQ`
   - Or filter by process: `process:PuttIQ`

5. **Reproduce the crash:**
   - With Console open and filtering
   - Open PuttIQ on your iPhone
   - Go straight to Listen Mode (trigger the crash)

6. **Watch the logs in real-time:**
   - You'll see our debug statements:
     ```
     Debug: Stopping audio engine before tap installation
     Debug: Checking for existing tap before installation
     🎙️ Starting audio stream recording (attempt 1/2)
     ```
   - Then the crash (if it happens)

7. **Save the logs:**
   - Select all relevant log entries
   - Right-click → **Export Selected Events**
   - Or just copy/paste the crash section

---

## Method 4: Via TestFlight Crash Reports

Apple collects these automatically!

### Steps:

1. **Wait 24 hours** after the crash (Apple processes them overnight)

2. **Go to App Store Connect:**
   - [https://appstoreconnect.apple.com/](https://appstoreconnect.apple.com/)

3. **Navigate to:**
   ```
   My Apps → PuttIQ → TestFlight → Builds → Select Build 13
   ```

4. **Click "Crashes"** tab

5. **View crash details:**
   - See crash count, affected devices
   - Click on a crash to see stack trace
   - Download symbolicated crash logs

**Note:** This only works if:
- ✅ Crash happened in TestFlight build
- ✅ 24+ hours have passed
- ✅ Device has "Share iPhone Analytics" enabled

---

## What to Look For in the Logs

### Our Debug Statements

If the fix is working, you should see:
```
Debug: Stopping audio engine before tap installation
Debug: Checking for existing tap before installation
Debug: Input node format - SR: 48000Hz, CH: 1
Debug: Requested format - SR: 44100Hz, CH: 1
🎙️ Starting audio stream recording (attempt 1/2)
✅ Audio stream recording started successfully
```

### If It's Still Crashing

Look for these error indicators:
```
❌ Error: could not start the audio engine
❌ com.apple.coreaudio.avfaudio error -10868
❌ AVAudioIONodeImpl::SetOutputFormat
❌ AudioSessionManager.swift line 444
```

### Key Information to Share

When you send me logs, I especially need:
1. **The exception type** (e.g., `EXC_CRASH (SIGABRT)`)
2. **The crashing thread's stack trace**
3. **Any log lines containing:**
   - `AudioSessionManager`
   - `expo-audio-stream`
   - Our debug statements
   - Error codes (especially `-10868`)

---

## Quick Checklist

If the crash happened during testing:

- [ ] Connect iPhone to Mac
- [ ] Open Xcode → Window → Devices and Simulators
- [ ] Select your iPhone → View Device Logs
- [ ] Find PuttIQ crash (recent timestamp)
- [ ] Export and share the `.crash` file

**OR**

- [ ] iPhone Settings → Privacy & Security → Analytics Data
- [ ] Find `PuttIQ-[date].ips` file
- [ ] Tap and share via AirDrop/Mail

---

## Pro Tips

### Enable Better Crash Reporting

On your iPhone:
```
Settings → Privacy & Security → Analytics & Improvements
→ Turn ON "Share iPhone Analytics"
→ Turn ON "Share iCloud Analytics"
```

### See All System Logs

In Console.app, remove the PuttIQ filter temporarily to see:
- Video player logs
- Audio session changes
- System warnings

Look for messages from:
- `AudioSession`
- `AVAudioEngine`
- `expo-video`

### Symbolicating Crash Logs

If you get a crash log with memory addresses instead of function names:

1. Xcode should auto-symbolicate if you have the build
2. Or download dSYMs from EAS:
   ```bash
   eas build:list --platform ios --limit 1
   # Click build URL → Download dSYMs
   ```

---

## Common Issues & Solutions

### Issue: "No crash logs appear in Xcode"

**Solution:**
- Make sure iPhone is **unlocked** when viewing logs
- Try disconnecting/reconnecting USB cable
- Restart Xcode

### Issue: "Crash log is from the wrong date"

**Solution:**
- Sort by Date Modified in Xcode
- Look at the timestamp at the top of the crash file
- Match it to when you tested

### Issue: "Analytics Data is empty in Settings"

**Solution:**
- Ensure "Share iPhone Analytics" is enabled
- Crashes may take a few minutes to appear
- Try Xcode method instead

---

## What I Need From You

To help debug, please share:

1. **The crash log file** (`.crash` or `.ips`)
2. **When it crashed** (what you were doing):
   - [ ] Opening app → immediately tapping Listen Mode
   - [ ] Switching sound types first
   - [ ] Multiple toggles
   - [ ] Other scenario: ___________

3. **Any visible error messages** on screen

4. **Build information:**
   - Version: 1.1.1
   - Build: 13
   - Profile: production/preview

---

## Next Steps After Getting Logs

Once you share the crash log:

1. I'll analyze the stack trace
2. Identify why the fix didn't work
3. Adjust the patch if needed
4. Create a new build to test

The debug logs will tell us exactly where it failed! 🔍
