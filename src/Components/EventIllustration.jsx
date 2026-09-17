import { Box, Typography, Paper } from "@mui/material";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import BarChartIcon from "@mui/icons-material/BarChart";

const EventIllustration = () => {
  return (
    <Box className="emsLogin__illustrationWrapper">

      <Typography variant="h3" className="emsLogin__brandTitle">
        Event Management
      </Typography>

      <Typography variant="h6" className="emsLogin__brandSubTitle">
        Admin Dashboard
      </Typography>

      <Typography className="emsLogin__brandDescription">
        Manage events, attendees, tickets and reports from one
        professional dashboard.
      </Typography>

      <Box className="emsLogin__featureGrid">

        <Paper className="emsLogin__featureCard">
          <EventAvailableIcon fontSize="large" />
          <Typography>Events</Typography>
        </Paper>

        <Paper className="emsLogin__featureCard">
          <ConfirmationNumberIcon fontSize="large" />
          <Typography>Tickets</Typography>
        </Paper>

        <Paper className="emsLogin__featureCard">
          <PeopleAltIcon fontSize="large" />
          <Typography>Attendees</Typography>
        </Paper>

        <Paper className="emsLogin__featureCard">
          <BarChartIcon fontSize="large" />
          <Typography>Reports</Typography>
        </Paper>

      </Box>

    </Box>
  );
};

export default EventIllustration;