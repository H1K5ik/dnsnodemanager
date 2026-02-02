import React from 'react';
import { NotificationContext } from './NotificationProvider';
import axios from 'axios';

export default function useAPI() {

  const notifier = React.useContext(NotificationContext);

  function fetchApiData(action) {
    return axios.get('/API/' + action).then(handleFetchResponse).catch(handleError);
  }

  function postApiData(action, data) {
    notifier.showBackdrop();
    return axios.post('/API/' + action, data).then(handleQueryResponse).catch(handleError);
  }

  function patchApiData(action, data) {
    notifier.showBackdrop();
    return axios.patch('/API/' + action, data).then(handleQueryResponse).catch(handleError);
  }

  function deleteApiData(action, data) {
    notifier.showBackdrop();
    return axios.delete('/API/' + action, {data: data}).then(handleQueryResponse).catch(handleError);
  }

  function handleFetchResponse(response) {
    console.log(response);
    if( ! response.data ) {
      notifier.setNotification("error", "Error in API communication");
      return false;
    }
    // Show error notification instead of reloading page
    if( response.data.hasOwnProperty('success') && ! response.data.success ) {
      notifier.setNotification("error", response.data.message || "Error in API communication");
      return false;
    }
    return response.data.data;
  }

  function handleQueryResponse(response) {
    console.log(response);
    notifier.hideBackdrop();
    if( ! response.data && ! response.data.hasOwnProperty('success') ) {
      notifier.setNotification("error", "Error in API communication. Host machine down?");
      return false;
    }
    if( ! response.data.success ) {
      if (response.data.code === 'PTR_EXISTS' || response.data.code === 'PTR_EXISTS_DELETE' || response.data.code === 'ZONE_PTR_EXISTS_DELETE') {
        return response.data;
      }
      notifier.setNotification("error", response.data.message);
      return false;
    }
    notifier.setNotification("success", response.data.message);
    notifier.getConfigSync();
    return response.data;
  }

  function handleError(error) {
    notifier.hideBackdrop();
    notifier.setNotification("error", "Error in API communication: " + error.toString());
    return false;
  }

  return {
    // General info
    getSessionUser: () => {
      return fetchApiData("SESSION");
    },
    getAppInfo: () => {
      return fetchApiData("APPINFO");
    },
    getSshPubKey: () => {
      return fetchApiData("SSHPUBKEY");
    },
    getAuditLog: () => {
      return fetchApiData("AUDIT_LOG");
    },
    getStats: () => {
      return fetchApiData("STATS");
    },
    // Authentication
    authenticateUser: cred => {
      return postApiData("LOGIN", cred);
    },
    logoutUser: () => {
      return postApiData("LOGOUT");
    },
    // Servers
    getServers: () => {
      return fetchApiData("SERVERS");
    },
    getSshHealth: serverId => {
      return fetchApiData("SERVER/" + String(serverId) + "/SSH_HEALTH");
    },
    addServer: data => {
      return postApiData("SERVER", data);
    },
    updateServer: data => {
      return patchApiData("SERVER", data);
    },
    deleteServer: data => {
      return deleteApiData("SERVER", data);
    },
    forceConfigSync: data => {
      return postApiData("SERVER/SYNC", data);
    },
    syncAllServers: data => {
      return postApiData("ROLLOUT", data);
    },
    // Users
    getUsers: () => {
      return fetchApiData("USERS");
    },
    addUser: data => {
      return postApiData("USER", data);
    },
    deleteUser: data => {
      return deleteApiData("USER", data);
    },
    updateUser: data => {
      return patchApiData("USER", data);
    },
    // Nameserver Groups
    getNsGroups: () => {
      return fetchApiData("NSGROUPS/LIST");
    },
    addNsGroup: data => {
      return postApiData("NSGROUP", data);
    },
    updateNsGroup: data => {
      return patchApiData("NSGROUP", data);
    },
    deleteNsGroup: data => {
      return deleteApiData("NSGROUP", data);
    },
    getNsGroupMembers: groupId => {
      return fetchApiData("NSGROUP/" + String(groupId) + "/MEMBERS");
    },
    addNsGroupMember: data => {
      return postApiData("NSGROUP/MEMBER", data);
    },
    setNsGroupPrimary: data => {
      return patchApiData("NSGROUP/PRIMARY", data);
    },
    updateNsGroupMember: data => {
      return patchApiData("NSGROUP/MEMBER", data);
    },
    deleteNsGroupMember: data => {
      return deleteApiData("NSGROUP/MEMBER", data);
    },
    // User NS Group Access
    getUserNsGroupAccess: userId => {
      return fetchApiData("USER/" + String(userId) + "/NSGROUPACCESS");
    },
    getAllNsGroups: () => {
      return fetchApiData("NSGROUPS/ALL");
    },
    setUserNsGroupAccess: data => {
      return postApiData("USER/NSGROUPACCESS", data);
    },
    // Views
    getDnsViews: () => {
      return fetchApiData("VIEWS");
    },
    addView: name => {
      return postApiData("VIEW", {name: name});
    },
    updateView: data => {
      return patchApiData("VIEW", data);
    },
    deleteView: name => {
      return deleteApiData("VIEW", {name: name});
    },
    // ACLs
    getAcls: () => {
      return fetchApiData("ACLS");
    },
    addAcl: data => {
      return postApiData("ACL", data);
    },
    updateAcl: data => {
      return patchApiData("ACL", data);
    },
    deleteAcl: data => {
      return deleteApiData("ACL", data);
    },
    // Forwarder Groups
    getFwdGroups: () => {
      return fetchApiData("FWDGROUPS");
    },
    addFwdGroup: data => {
      return postApiData("FWDGROUP", data);
    },
    updateFwdGroup: data => {
      return patchApiData("FWDGROUP", data);
    },
    deleteFwdGroup: data => {
      return deleteApiData("FWDGROUP", data);
    },
    // Zones
    getDnsZones: () => {
      return fetchApiData("ZONES");
    },
    getDnsZone: zoneId => {
      return fetchApiData("ZONE/" + String(zoneId));
    },
    getZoneFilePreview: zoneId => {
      return fetchApiData("ZONE/" + String(zoneId) + "/PREVIEW");
    },
    addDnsZone: data => {
      return postApiData("ZONE", data);
    },
    importZones: data => {
      return postApiData("ZONES/IMPORT", data);
    },
    updateDnsZone: data => {
      return patchApiData("ZONE", data);
    },
    freezeDnsZone: data => {
      return patchApiData("ZONE/FREEZE", data);
    },
    thawDnsZone: data => {
      return patchApiData("ZONE/THAW", data);
    },
    syncDnsZone: data => {
      return patchApiData("ZONE/SYNC", data);
    },
    deleteZones: data => {
      return deleteApiData("ZONES", data);
    },
    analyzeImportZonesFile: data => {
      return postApiData("ZONES/CONVERTBIND", data);
    },
    analyzeImportZonesCSV: data => {
      return postApiData("ZONES/CONVERTCSV", data);
    },
    // Records
    getDnsRecords: zoneId => {
      return fetchApiData("ZONE/" + String(zoneId) + "/RECORDS");
    },
    addDnsRecord: data => {
      return postApiData("RECORD", data);
    },
    importRecords: data => {
      return postApiData("RECORDS/IMPORT", data);
    },
    updateDnsRecord: data => {
      return patchApiData("RECORD", data);
    },
    updateRecordsTTL: data => {
      return patchApiData("ZONES", data);
    },
    deleteDnsRecords: data => {
      return deleteApiData("RECORDS", data);
    },
    analyzeImportRecordsFile: data => {
      return postApiData("RECORDS/CONVERTBIND", data);
    },
    analyzeImportRecordsCSV: data => {
      return postApiData("RECORDS/CONVERTCSV", data);
    }
  }

}
