/**
 * Computes the farmer category deterministically based on land size.
 * Uses the exact same thresholds as backend/services/eligibility_service.py.
 * 
 * @param {string|number} landSize - The land size in acres
 * @returns {string|null} The farmer category, or null if unknown
 */
export function computeFarmerCategory(landSize) {
  if (landSize === null || landSize === undefined || landSize === '') {
    return null;
  }

  const acres = parseFloat(landSize);
  if (isNaN(acres) || acres < 0) {
    return null;
  }

  if (acres === 0) {
    return 'Landless';
  } else if (acres <= 2.47) {
    return 'Marginal';
  } else if (acres <= 4.94) {
    return 'Small';
  } else if (acres <= 9.88) {
    return 'Semi-Medium';
  } else if (acres <= 24.7) {
    return 'Medium';
  } else {
    return 'Large';
  }
}
