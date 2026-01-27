import React from "react";
import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';

export default function ContentHeader(props) {
  return (
    <Box m={2}>
      <Grid container spacing={1} justifyContent="space-between" direction="row">
        <Grid item>
          <Typography variant="h4">{props.title}</Typography>
        </Grid>
        <Grid item>
          {props.children}
        </Grid>
      </Grid>
    </Box>
  );
}
