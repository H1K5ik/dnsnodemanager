import React from "react";
import TableRow from '@material-ui/core/TableRow';
import TableCell from '@material-ui/core/TableCell';
import IconButton from '@material-ui/core/IconButton';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';

import FwdGroupDialog from './FwdGroupDialog';
import useAPI from './common/api';

export default function FwdGroupRow(props) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const api = useAPI();

  function updateGroup(data) {
    return api.updateFwdGroup(data).then( result => {
      if( result ) {
        setDialogOpen(false);
        props.onRefresh();
      }
    } );
  }

  function deleteGroup() {
    api.deleteFwdGroup(props.data).then(props.onRefresh);
  }

  return (
    <TableRow>
      <TableCell>{props.data.name}</TableCell>
      <TableCell style={{ whiteSpace: 'normal', wordBreak: 'break-word', maxWidth: 420 }}>{props.data.members}</TableCell>
      <TableCell component="th" scope="row">
        <IconButton aria-haspopup="true" color="primary" disabled={props.readOnly} children={<EditIcon />} onClick={() => { setDialogOpen(true); }} />
        <IconButton aria-haspopup="true" color="primary" disabled={props.readOnly} children={<DeleteIcon />} onClick={deleteGroup} />
        <FwdGroupDialog open={dialogOpen} data={props.data} onSubmit={updateGroup} onClose={() => { setDialogOpen(false); }} />
      </TableCell>
    </TableRow>
  );
}
