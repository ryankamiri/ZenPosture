import ThresholdSlider from '../components/ThresholdSlider';

<div className="setting-item">
  <ThresholdSlider
    label="Posture Sensitivity"
    value={postureSensitivity}
    onChange={handleSensitivityChange}
    min={1}
    max={10}
    step={1}
    description="Higher values make the app more sensitive to posture changes. Lower values are more forgiving."
  />
</div>

<div className="setting-item">
  <ThresholdSlider
    label="Notification Threshold"
    value={notificationThreshold}
    onChange={handleNotificationThresholdChange}
    min={30}
    max={90}
    step={5}
    description="Minimum posture score that will trigger a notification."
  />
</div> 