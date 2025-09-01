import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
} from '@react-email/components';

interface StaffInvitationEmailProps {
    businessName: string;
    inviterName: string;
    inviteUrl: string;
    displayName: string;
    title?: string;
    employmentType: 'COMMISSION' | 'CHAIR_RENTAL' | 'HYBRID';
    message?: string;
    expiresAt: Date;
}

export const StaffInvitationEmail = ({
    businessName = 'Lumina Business',
    inviterName = 'Team Member',
    inviteUrl = 'https://app.uselumina.com/auth/staff-invite?token=example',
    displayName = 'Staff Member',
    title,
    employmentType = 'COMMISSION',
    message,
    expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
}: StaffInvitationEmailProps) => {
    const previewText = `You're invited to join ${businessName} as a staff member`;

    const employmentTypeDisplay = {
        COMMISSION: 'Commission-based',
        CHAIR_RENTAL: 'Chair Rental',
        HYBRID: 'Hybrid (Commission + Chair Rental)',
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={logoContainer}>
                        <Img
                            src="https://app.uselumina.com/logo.png"
                            width="120"
                            height="36"
                            alt="Lumina"
                            style={logo}
                        />
                    </Section>

                    <Section style={content}>
                        <Heading style={h1}>You're Invited to Join {businessName}!</Heading>

                        <Text style={text}>
                            Hi {displayName},
                        </Text>

                        <Text style={text}>
                            {inviterName} has invited you to join <strong>{businessName}</strong> as a staff member on Lumina.
                        </Text>

                        {title && (
                            <Text style={text}>
                                <strong>Position:</strong> {title}
                            </Text>
                        )}

                        <Text style={text}>
                            <strong>Employment Type:</strong> {employmentTypeDisplay[employmentType]}
                        </Text>

                        {message && (
                            <Section style={messageSection}>
                                <Text style={messageText}>
                                    <strong>Personal Message:</strong>
                                </Text>
                                <Text style={messageContent}>
                                    "{message}"
                                </Text>
                            </Section>
                        )}

                        <Text style={text}>
                            Click the button below to accept your invitation and set up your account:
                        </Text>

                        <Section style={buttonContainer}>
                            <Button style={button} href={inviteUrl}>
                                Accept Invitation
                            </Button>
                        </Section>

                        <Text style={text}>
                            Or copy and paste this URL into your browser:
                        </Text>
                        <Link href={inviteUrl} style={link}>
                            {inviteUrl}
                        </Link>

                        <Text style={smallText}>
                            This invitation will expire on {formatDate(expiresAt)}. If you don't accept by then,
                            you'll need to request a new invitation.
                        </Text>

                        <Text style={text}>
                            Welcome to the team!<br />
                            The Lumina Team
                        </Text>
                    </Section>

                    <Section style={footer}>
                        <Text style={footerText}>
                            This invitation was sent to you by {businessName}. If you weren't expecting this invitation,
                            you can safely ignore this email.
                        </Text>
                        <Text style={footerText}>
                            © 2024 Lumina. All rights reserved.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

// Styles
const main = {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 0 48px',
    marginBottom: '64px',
};

const logoContainer = {
    padding: '32px 20px',
    textAlign: 'center' as const,
};

const logo = {
    margin: '0 auto',
};

const content = {
    padding: '0 20px',
};

const h1 = {
    color: '#0B2B33',
    fontSize: '24px',
    fontWeight: '600',
    lineHeight: '1.25',
    margin: '16px 0',
    textAlign: 'center' as const,
};

const text = {
    color: '#525f7f',
    fontSize: '16px',
    lineHeight: '1.4',
    margin: '16px 0',
};

const messageSection = {
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    padding: '16px',
    margin: '24px 0',
};

const messageText = {
    color: '#0B2B33',
    fontSize: '14px',
    fontWeight: '600',
    margin: '0 0 8px 0',
};

const messageContent = {
    color: '#525f7f',
    fontSize: '14px',
    fontStyle: 'italic',
    lineHeight: '1.4',
    margin: '0',
};

const buttonContainer = {
    textAlign: 'center' as const,
    margin: '32px 0',
};

const button = {
    backgroundColor: '#FF7A5A',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '12px 24px',
    lineHeight: '1.25',
};

const link = {
    color: '#FF7A5A',
    fontSize: '14px',
    textDecoration: 'underline',
    wordBreak: 'break-all' as const,
};

const smallText = {
    color: '#8898aa',
    fontSize: '14px',
    lineHeight: '1.4',
    margin: '24px 0 16px 0',
};

const footer = {
    borderTop: '1px solid #e6ebf1',
    padding: '32px 20px 0',
    textAlign: 'center' as const,
};

const footerText = {
    color: '#8898aa',
    fontSize: '12px',
    lineHeight: '1.4',
    margin: '8px 0',
};

export default StaffInvitationEmail;