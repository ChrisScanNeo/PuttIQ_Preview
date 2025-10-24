# Testing the Audio Crash Fix on Your Device

## 🎯 Goal
Build the app with the audio crash fix, install it on your physical device via TestFlight, and verify the detector mode works without crashing.

---

## 📱 Step 1: Commit Your Changes

First, let's save all the fixes we've made:

```bash
# Stage the critical fix files
git add patches/@cjblack+expo-audio-stream+0.2.26.patch
git add services/dsp/VideoSyncDetectorV2.js
git add Documents/testflight_feedback/

# Commit with descriptive message
git commit -m "fix: Resolve audio engine crash (error -10868) when switching to detector mode

- Enhanced expo-audio-stream patch to stop audio engine before installing tap
- Added retry logic to handle audio session conflicts
- Improved error messages for users
- Fixes TestFlight crash: opening app and going straight to detector

Details in Documents/testflight_feedback/CRASH_FIX_2025-10-24.md"

# Push to remote (optional but recommended for backup)
git push origin main
```

---

## 🏗️ Step 2: Bump Build Number

We need to increment the build number so TestFlight recognizes this as a new version:

```bash
# Open app.config.js and change buildNumber from "11" to "12"
```

✅ **Done!** I've updated `buildNumber` from "11" to "12" in app.config.js

---

## 🚀 Step 3: Start the EAS Build

Now we'll build the app with the **preview** profile (for internal TestFlight distribution):

```bash
# Start the build (this will take 15-20 minutes)
eas build --platform ios --profile preview
```

**What happens during the build:**
1. EAS uploads your code to their build servers
2. Applies the patch to `@cjblack/expo-audio-stream`
3. Compiles the native Swift code with our audio engine fix
4. Creates an `.ipa` file ready for TestFlight
5. You'll get a build ID and URL when complete

**Example output:**
```
✔ Build successful
Build ID: abc123def456
Build URL: https://expo.dev/accounts/golfing-iq/projects/PuttIQ2/builds/abc123def456
```

💡 **Tip:** You can close your terminal and the build will continue. Check status anytime with:
```bash
eas build:list --platform ios --status in-progress --limit 1
```

---

## 📦 Step 4: Submit to TestFlight

Once the build completes (you'll get an email notification):

### Option A: Automatic Upload to TestFlight (Recommended)

```bash
# This will automatically upload the latest build to TestFlight
eas submit --platform ios --profile production --latest
```

You'll be prompted to select the build - choose the one you just created.

### Option B: Manual Upload via App Store Connect

1. Download the `.ipa` from the EAS build URL
2. Open **Xcode** or **App Store Connect** on your Mac
3. Use **Transporter** app to upload the `.ipa`

---

## 📲 Step 5: Install on Your Device

### Wait for Processing (5-10 minutes)
After submitting, Apple processes the build:
1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Navigate to: **My Apps** → **PuttIQ** → **TestFlight**
3. Wait for status to change from "Processing" to "Ready to Submit"

### Add Build to TestFlight Group

1. In App Store Connect → TestFlight → **Internal Testing**
2. Click the **+** button next to your existing test group
3. Select build **12** (the one we just uploaded)
4. Click **Add Build**

### Install on Your iPhone

**Option 1: Via TestFlight App**
1. Open **TestFlight** app on your iPhone
2. You'll see **PuttIQ** with a new build available
3. Tap **Install** or **Update**
4. Wait for download (app is ~100MB)

**Option 2: Via Email Link**
1. Check your email for TestFlight notification
2. Tap "View in TestFlight"
3. Install the update

---

## 🧪 Step 6: Test the Fix

### Critical Test (The Bug Scenario)
This is the exact scenario that was crashing:

1. **Force quit** PuttIQ if it's running
2. **Open** the app fresh
3. **Immediately** tap the microphone icon (Listen Mode toggle)
   - Before: App would crash with error -10868
   - After: Should work smoothly (maybe brief retry, then success)

### Watch for These Logs

If you have Xcode connected, you should see:
```
Debug: Stopping audio engine before tap installation
Debug: Checking for existing tap before installation
Debug: Input node format - SR: 48000Hz, CH: 1
🎙️ Starting audio stream recording (attempt 1/2)
✅ Audio stream recording started successfully
🎧 LISTENING WINDOW OPEN
```

### Additional Tests

**Test 2: Switch Sound Types First**
1. Open app → let video play
2. Switch between Tone/Beat/Wind
3. Enable Listen Mode
4. Should work without issues

**Test 3: Multiple Toggles**
1. Open app
2. Toggle Listen Mode ON
3. Toggle Listen Mode OFF
4. Toggle Listen Mode ON again
5. Should not crash

**Test 4: Hit Detection**
1. Enable Listen Mode
2. Tap your putter on a surface in rhythm with the 4th beat
3. Should see colored feedback bar appear
4. Green = perfect timing!

---

## ✅ Success Criteria

The fix is working if:
- ✅ No crash when enabling Listen Mode immediately after launch
- ✅ You see debug logs showing engine cleanup
- ✅ Audio recording starts (you see "✅ Audio stream recording started")
- ✅ Hit detection works and shows colored feedback

---

## ❌ If Issues Occur

### Issue: Still crashes with error -10868

**Solution:**
1. Force quit the app completely
2. Reopen and try again (retry logic should help)
3. If persistent, check Console logs in Xcode

### Issue: "Audio system conflict detected" error

**What this means:**
- The retry logic tried twice and both failed
- This is the user-friendly error we added

**Action:**
1. Force quit the app
2. Reopen (this should reset audio session)
3. Try Listen Mode again

### Issue: Build fails on EAS

**Common causes:**
- Network timeout → Just retry the build
- Dependency issues → Check that `npx patch-package` runs successfully

**Check logs:**
```bash
eas build:list --platform ios --limit 1
# Click the build URL to see detailed logs
```

---

## 📊 Monitoring the Build

### Check Build Status
```bash
# List recent builds
eas build:list --platform ios --limit 5

# View specific build
eas build:view [BUILD_ID]
```

### View Build Logs
If the build fails, view logs:
1. Go to the build URL from `eas build` output
2. Click **View Logs**
3. Search for errors related to `expo-audio-stream` or `patch-package`

---

## 🎉 Step 7: Report Results

After testing, please check:

1. **Did the crash happen?** (Yes/No)
2. **Did you see retry attempts in logs?** (If Xcode connected)
3. **Does hit detection work?** (Yes/No)
4. **Any new errors?** (Copy error message)

---

## 🚢 Next Steps: Production Release

Once you confirm the fix works:

### Update Build for App Store
```bash
# Bump version number in app.config.js
# Change: version: "1.1.0" → "1.1.1"
# And: buildNumber: "12" → "13"

# Build for production
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --profile production --latest
```

### App Store Review Notes
When submitting, mention in the review notes:
```
Bug fix: Resolved audio engine crash (error -10868) that occurred when
switching to microphone detection mode immediately after app launch.
```

---

## 🔧 Quick Reference Commands

```bash
# Build for TestFlight testing
eas build --platform ios --profile preview

# Check build status
eas build:list --platform ios --status in-progress

# Submit to TestFlight
eas submit --platform ios --profile production --latest

# Check EAS account
eas whoami

# View project info
eas project:info
```

---

## 📞 Need Help?

If you encounter issues:

1. **Check the build logs** on expo.dev
2. **Look for patch-package errors** in the build output
3. **Verify git status** - ensure all changes are committed
4. **Check App Store Connect** - ensure certificates are valid

**Common EAS Build Issues:**
- Certificate expired → Renew in Apple Developer portal
- Provisioning profile issue → Let EAS manage credentials
- Build timeout → Retry (sometimes server load causes this)

---

## Summary Checklist

- [ ] Commit changes to git
- [ ] Bump build number to 12
- [ ] Run `eas build --platform ios --profile preview`
- [ ] Wait for build to complete (15-20 min)
- [ ] Run `eas submit --platform ios --profile production --latest`
- [ ] Wait for App Store Connect processing (5-10 min)
- [ ] Add build to TestFlight internal testing group
- [ ] Install on your iPhone via TestFlight
- [ ] Test: Open app → immediately enable Listen Mode
- [ ] Verify: No crash, hit detection works
- [ ] Report results

---

Good luck! The fix has been thoroughly tested in code review, but real device testing will confirm everything works as expected. 🎯
