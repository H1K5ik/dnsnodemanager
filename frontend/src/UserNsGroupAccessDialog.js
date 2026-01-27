import React from 'react';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import LinearProgress from '@material-ui/core/LinearProgress';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';

import useAPI from './common/api';

export default function UserNsGroupAccessDialog(props) {
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [allGroups, setAllGroups] = React.useState([]);
  const [selectedGroups, setSelectedGroups] = React.useState([]);
  const api = useAPI();

  React.useEffect(() => {
    if (props.open && props.userId) {
      loadData();
    }
  }, [props.open, props.userId]); // eslint-disable-line

  function loadData() {
    setLoading(true);
    Promise.all([
      api.getAllNsGroups(),
      api.getUserNsGroupAccess(props.userId)
    ]).then(([allGroupsData, userAccessData]) => {
      setAllGroups(allGroupsData || []);
      const accessGroupIds = (userAccessData || []).map(g => g.ID);
      setSelectedGroups(accessGroupIds);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }

  function handleToggle(groupId) {
    setSelectedGroups(prev => {
      if (prev.includes(groupId)) {
        return prev.filter(id => id !== groupId);
      } else {
        return [...prev, groupId];
      }
    });
  }

  function handleSelectAll() {
    if (selectedGroups.length === allGroups.length) {
      setSelectedGroups([]);
    } else {
      setSelectedGroups(allGroups.map(g => g.ID));
    }
  }

  function submitForm() {
    setBusy(true);
    api.setUserNsGroupAccess({
      userId: props.userId,
      groupIds: selectedGroups
    }).then(result => {
      setBusy(false);
      if (result) {
        props.onClose();
        if (props.onRefresh) props.onRefresh();
      }
    });
  }

  return (
    <Dialog maxWidth="sm" fullWidth open={props.open} onClose={props.onClose}>
      <DialogTitle>Manage Nameserver Group Access</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box m={2}><LinearProgress /></Box>
        ) : (
          <>
            <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
              Select which Nameserver Groups this DNS Operator can access:
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedGroups.length === allGroups.length && allGroups.length > 0}
                  indeterminate={selectedGroups.length > 0 && selectedGroups.length < allGroups.length}
                  onChange={handleSelectAll}
                />
              }
              label="Select All"
            />
            <List style={{ maxHeight: 400, overflow: 'auto' }}>
              {allGroups.map(group => (
                <ListItem key={group.ID} dense button onClick={() => handleToggle(group.ID)}>
                  <Checkbox
                    checked={selectedGroups.includes(group.ID)}
                    tabIndex={-1}
                    disableRipple
                  />
                  <ListItemText primary={group.name} />
                </ListItem>
              ))}
            </List>
            {allGroups.length === 0 && (
              <Typography variant="body2" color="textSecondary" style={{ padding: 16, textAlign: 'center' }}>
                No Nameserver Groups available
              </Typography>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button disabled={busy || loading} onClick={props.onClose}>Cancel</Button>
        <Button disabled={busy || loading} onClick={submitForm} color="primary" variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
}


