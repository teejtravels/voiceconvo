const getBackendUrl = () => {
    // Get the current Codespace URL
    const codespaceUrl = window.location.hostname;
    // Replace the port number for backend
    return `https://${codespaceUrl.replace('-3000', '-5000')}`;
  };
  
  export const API_URL = getBackendUrl();