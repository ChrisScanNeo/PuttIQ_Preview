# Video Loading Diagnostic Report

## Debug Logging Added

Enhanced logging has been added to track video loading in real-time.

### Console Log Format

#### Video Loading (getVideoSource):
```
✅ Loading video: tone-75 (Type: tone, BPM: 75)
```
Shows when a video is successfully found and loaded.

```
❌ Video not found for tone at 85 BPM, falling back to 70 BPM
📹 Loading fallback: tone-70
```
Shows when a video is missing and falls back to 70 BPM.

#### Video Key Updates:
```javascript
🎥 Video key update: {
  key: 'tone-75',
  soundType: 'tone',
  bpm: 75,
  listenMode: false,
  platform: 'ios',
  exists: '✅',
  willFallback: false
}
```
Shows the video key being set, with details about platform and whether video exists.

## Expected Video Map Structure

### iOS - All Entries Should Exist (44 total)

**Tone Videos (11):**
- tone-70 through tone-80 ✅

**Beat Videos (11):**
- beat-70 through beat-80 ✅

**Wind Videos (11):**
- wind-70 through wind-80 ✅

**Detect Videos (11):**
- detect-70 through detect-80 ✅

### Android - Mixed Sources (44 total)

**Tone Videos (11):**
- tone-70: .webm ✅
- tone-71 to tone-80: iOS .mov fallback ⚠️

**Beat Videos (11):**
- beat-70: .webm ✅
- beat-71 to beat-80: iOS .mov fallback ⚠️

**Wind Videos (11):**
- wind-70: .webm ✅
- wind-71 to wind-80: iOS .mov fallback ⚠️

**Detect Videos (11):**
- detect-70 to detect-80: iOS .mov fallback ⚠️

## Common Issues & Solutions

### Issue: "Video not found" warnings for BPMs 70-80

**Symptom:** Console shows ❌ messages even though files exist

**Possible Causes:**
1. **File path typo in videoMap** - Check require() paths
2. **File missing from filesystem** - Verify file exists
3. **Platform mismatch** - Android trying to load .webm that doesn't exist

**Solution:**
- Check console logs for exact key being requested
- Verify file exists: `ls assets/swingBars/[platform]/[type]/[filename]`
- Ensure videoMap entry matches exactly

### Issue: All BPMs play same tempo

**Symptom:** Changing BPM slider doesn't change tempo

**Root Cause:** Videos falling back to 70 BPM because videoMap entries missing

**Solution:**
- Check console for ❌ fallback messages
- Verify all videoMap entries exist for 70-80
- Confirm files exist in filesystem

### Issue: Video displays incorrectly

**Symptom:** Video appears in wrong location or wrong size

**Root Cause:** Likely CSS/styling issue, not video loading issue

**Check:**
- VideoView component styles
- Container dimensions
- Border/transparency settings

## Troubleshooting Steps

1. **Open Developer Console** (while app running)

2. **Change BPM** from 70 to 75:
   - Look for: `🎥 Video key update: { key: 'tone-75', ... }`
   - Then: `✅ Loading video: tone-75 (Type: tone, BPM: 75)`
   - If you see ❌: Video is missing from videoMap

3. **Change Sound Type** from Tone to Beat:
   - Look for: `🎥 Video key update: { key: 'beat-75', ... }`
   - Then: `✅ Loading video: beat-75 (Type: beat, BPM: 75)`

4. **Enable Listen Mode**:
   - Look for: `🎥 Video key update: { key: 'detect-75', ... }`
   - Then: `✅ Loading detect video: detect-75`

## Expected Log Sequence

### Normal Operation (BPM 70 → 75):
```
🎥 Video key update: { key: 'tone-75', soundType: 'tone', bpm: 75, platform: 'ios', exists: '✅' }
✅ Loading video: tone-75 (Type: tone, BPM: 75)
```

### Fallback Operation (BPM 70 → 85, if 85 doesn't exist):
```
🎥 Video key update: { key: 'tone-85', soundType: 'tone', bpm: 85, platform: 'ios', exists: '❌', willFallback: true }
❌ Video not found for tone at 85 BPM, falling back to 70 BPM
📹 Loading fallback: tone-70
✅ Loading video: tone-70 (Type: tone, BPM: 70)
```

## Video File Verification Commands

```bash
# Check iOS tone videos exist (70-80)
ls -1 assets/swingBars/ios/tones/Tones_*BPM.mov

# Check Android tone videos exist
ls -1 assets/swingBars/android/tones/Tones_*BPM.webm

# Check detect videos exist (70-80)
ls -1 assets/swingBars/ios/detect/Tones_Detect_*BPM.mov
```

## Next Steps for User

1. **Run the app** on your device
2. **Open developer console** to see logs
3. **Test each BPM** from 70 to 80
4. **Note any ❌ messages** in console
5. **Share console output** showing the issue

This will help identify exactly which videos are loading/failing.
