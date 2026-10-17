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

/**
 * Why the client is hearing from us. A confirmation by default; a move carries
 * where the appointment was, so the client can see what changed.
 */
export type AppointmentNotice =
  | { kind: 'confirmed' }
  | {
      kind: 'moved';
      previous: { appointmentDate: string; appointmentTime: string };
    }
  | { kind: 'cancelled' };

const COPY = {
  confirmed: {
    preview: (business: string) =>
      `Your appointment at ${business} is confirmed`,
    heading: 'Appointment Confirmed!',
    subtitle: (business: string) =>
      `Your booking at ${business} has been successfully scheduled.`,
    footer: 'This is an automated confirmation email.',
  },
  moved: {
    preview: (business: string) => `Your appointment at ${business} has moved`,
    heading: 'Appointment Moved',
    subtitle: (business: string) =>
      `${business} has moved your appointment to a new time.`,
    footer: 'This is an automated email about a change to your booking.',
  },
  cancelled: {
    preview: (business: string) =>
      `Your appointment at ${business} is cancelled`,
    heading: 'Appointment Cancelled',
    subtitle: (business: string) =>
      `Your appointment at ${business} has been cancelled.`,
    footer: 'This is an automated email about a change to your booking.',
  },
} as const;

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
  notice?: AppointmentNotice;
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
  notice = { kind: 'confirmed' },
}: BookingConfirmationEmailProps) {
  const copy = COPY[notice.kind];

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
      <Preview>{copy.preview(businessName)}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>{copy.heading}</Heading>
            <Text style={subtitle}>{copy.subtitle(businessName)}</Text>
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

            {notice.kind === 'moved' && (
              <Row style={detailRow}>
                <Column style={labelColumn}>
                  <Text style={label}>Was:</Text>
                </Column>
                <Column style={valueColumn}>
                  <Text style={previousValue}>
                    {notice.previous.appointmentDate},{' '}
                    {notice.previous.appointmentTime}
                  </Text>
                </Column>
              </Row>
            )}

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
          {notice.kind !== 'cancelled' && (
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
          )}

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              {notice.kind === 'cancelled'
                ? `To book again, contact ${businessName} or visit their booking page.`
                : `Thank you for choosing ${businessName}! We look forward to seeing you.`}
            </Text>
            <Text style={footerText}>
              {copy.footer} Please do not reply to this email.
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

const previousValue = {
  ...value,
  color: email.textMuted,
  fontWeight: '500',
  textDecoration: 'line-through',
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
