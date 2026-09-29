import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components';
import { base, brand, email } from '@/lib/design/tokens';

interface BookingConfirmationEmailProps {
  customerName: string;
  businessName: string;
  serviceName: string;
  staffName: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  price: number;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  appointmentId: string;
  notes?: string;
}

export default function BookingConfirmationEmail({
  customerName,
  businessName,
  serviceName,
  staffName,
  appointmentDate,
  appointmentTime,
  duration,
  price,
  businessAddress,
  businessPhone,
  businessEmail,
  appointmentId,
  notes,
}: BookingConfirmationEmailProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}m`;
    }
  };

  return (
    <Html>
      <Head />
      <Preview>Your appointment at {businessName} is confirmed</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>Appointment Confirmed!</Heading>
            <Text style={subtitle}>
              Your booking at {businessName} has been successfully scheduled.
            </Text>
          </Section>

          {/* Appointment Details */}
          <Section style={appointmentSection}>
            <Heading style={h2}>Appointment Details</Heading>

            <Row style={detailRow}>
              <Column style={labelColumn}>
                <Text style={label}>Confirmation ID:</Text>
              </Column>
              <Column style={valueColumn}>
                <Text style={value}>{appointmentId}</Text>
              </Column>
            </Row>

            <Row style={detailRow}>
              <Column style={labelColumn}>
                <Text style={label}>Service:</Text>
              </Column>
              <Column style={valueColumn}>
                <Text style={value}>{serviceName}</Text>
              </Column>
            </Row>

            <Row style={detailRow}>
              <Column style={labelColumn}>
                <Text style={label}>Staff Member:</Text>
              </Column>
              <Column style={valueColumn}>
                <Text style={value}>{staffName}</Text>
              </Column>
            </Row>

            <Row style={detailRow}>
              <Column style={labelColumn}>
                <Text style={label}>Date:</Text>
              </Column>
              <Column style={valueColumn}>
                <Text style={value}>{appointmentDate}</Text>
              </Column>
            </Row>

            <Row style={detailRow}>
              <Column style={labelColumn}>
                <Text style={label}>Time:</Text>
              </Column>
              <Column style={valueColumn}>
                <Text style={value}>{appointmentTime}</Text>
              </Column>
            </Row>

            <Row style={detailRow}>
              <Column style={labelColumn}>
                <Text style={label}>Duration:</Text>
              </Column>
              <Column style={valueColumn}>
                <Text style={value}>{formatDuration(duration)}</Text>
              </Column>
            </Row>

            <Row style={detailRow}>
              <Column style={labelColumn}>
                <Text style={label}>Price:</Text>
              </Column>
              <Column style={valueColumn}>
                <Text style={value}>{formatPrice(price)}</Text>
              </Column>
            </Row>

            {notes && (
              <Row style={detailRow}>
                <Column style={labelColumn}>
                  <Text style={label}>Notes:</Text>
                </Column>
                <Column style={valueColumn}>
                  <Text style={value}>{notes}</Text>
                </Column>
              </Row>
            )}
          </Section>

          {/* Business Information */}
          <Section style={businessSection}>
            <Heading style={h2}>Business Information</Heading>

            <Text style={businessNameStyle}>{businessName}</Text>

            {businessAddress && (
              <Text style={businessDetail}>{businessAddress}</Text>
            )}

            {businessPhone && (
              <Text style={businessDetail}>
                Phone:{' '}
                <Link href={`tel:${businessPhone}`}>{businessPhone}</Link>
              </Text>
            )}

            {businessEmail && (
              <Text style={businessDetail}>
                Email:{' '}
                <Link href={`mailto:${businessEmail}`}>{businessEmail}</Link>
              </Text>
            )}
          </Section>

          {/* Important Information */}
          <Section style={importantSection}>
            <Heading style={h2}>Important Information</Heading>

            <Text style={importantText}>
              • Please arrive 5-10 minutes early for your appointment
            </Text>
            <Text style={importantText}>
              • If you need to reschedule or cancel, please contact us as soon
              as possible
            </Text>
            <Text style={importantText}>
              • Bring a valid ID and any relevant medical information if
              applicable
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Thank you for choosing {businessName}! We look forward to seeing
              you.
            </Text>
            <Text style={footerText}>
              This is an automated confirmation email. Please do not reply to
              this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: email.canvas,
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: base.white,
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '32px 24px',
  textAlign: 'center' as const,
  backgroundColor: brand.gold,
};

const h1 = {
  color: brand.deepTeal,
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 8px',
};

const subtitle = {
  color: brand.deepTeal,
  fontSize: '16px',
  margin: '0',
};

const appointmentSection = {
  padding: '24px',
  borderBottom: `1px solid ${email.divider}`,
};

const businessSection = {
  padding: '24px',
  borderBottom: `1px solid ${email.divider}`,
};

const importantSection = {
  padding: '24px',
  borderBottom: `1px solid ${email.divider}`,
};

const footer = {
  padding: '24px',
  textAlign: 'center' as const,
};

const h2 = {
  color: brand.deepTeal,
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 16px',
};

const detailRow = {
  marginBottom: '12px',
};

const labelColumn = {
  width: '40%',
  verticalAlign: 'top' as const,
};

const valueColumn = {
  width: '60%',
  verticalAlign: 'top' as const,
};

const label = {
  color: email.textMuted,
  fontSize: '14px',
  fontWeight: '500',
  margin: '0',
};

const value = {
  color: email.text,
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
};

const businessNameStyle = {
  color: email.text,
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 8px',
};

const businessDetail = {
  color: email.textMuted,
  fontSize: '14px',
  margin: '0 0 4px',
};

const importantText = {
  color: email.text,
  fontSize: '14px',
  margin: '0 0 8px',
};

const footerText = {
  color: email.textMuted,
  fontSize: '12px',
  margin: '0 0 8px',
};
