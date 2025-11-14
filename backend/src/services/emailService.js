import { Logger } from '../middlewares/logger.js';

/**
 * Email Service
 * Handles transactional emails for SaaS operations
 * 
 * In production, integrate with:
 * - SendGrid
 * - AWS SES
 * - Postmark
 * - Mailgun
 */

class EmailService {
  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || 'console'; // console, sendgrid, ses
    this.from = process.env.EMAIL_FROM || 'noreply@nlqdb.com';
    this.supportEmail = process.env.SUPPORT_EMAIL || 'support@nlqdb.com';
    
    // Initialize email provider if configured
    if (this.provider === 'sendgrid' && process.env.SENDGRID_API_KEY) {
      // const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      // this.client = sgMail;
    }
  }

  /**
   * Send email (abstract method)
   */
  async sendEmail({ to, subject, html, text }) {
    try {
      if (this.provider === 'console') {
        // Development: Log to console
        Logger.info('📧 Email sent (console)', {
          to,
          subject,
          preview: text?.substring(0, 100)
        });
        console.log('\n=== EMAIL ===');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`\n${text || html}\n`);
        console.log('=============\n');
        return { success: true };
      }

      // Production: Use actual email provider
      if (this.provider === 'sendgrid' && this.client) {
        await this.client.send({
          to,
          from: this.from,
          subject,
          html,
          text
        });
        Logger.info('Email sent via SendGrid', { to, subject });
        return { success: true };
      }

      // Fallback
      Logger.warn('Email provider not configured', { to, subject });
      return { success: false, error: 'Email provider not configured' };
    } catch (error) {
      Logger.error('Failed to send email', error);
      throw error;
    }
  }

  /**
   * Welcome email for new users
   */
  async sendWelcomeEmail(user, organization) {
    const subject = `Welcome to NLQDB - ${organization.name}`;
    const text = `
Hi ${user.name},

Welcome to NLQDB! Your organization "${organization.name}" has been created successfully.

You're currently on the ${organization.plan.toUpperCase()} plan.

Get started:
- Connect your database
- Ask your first natural language query
- Invite team members

Need help? Reply to this email or visit our documentation.

Best regards,
The NLQDB Team
    `;

    const html = `
      <h1>Welcome to NLQDB!</h1>
      <p>Hi ${user.name},</p>
      <p>Your organization <strong>${organization.name}</strong> has been created successfully.</p>
      <p>You're currently on the <strong>${organization.plan.toUpperCase()}</strong> plan.</p>
      <h3>Get Started:</h3>
      <ul>
        <li>Connect your database</li>
        <li>Ask your first natural language query</li>
        <li>Invite team members</li>
      </ul>
      <p>Need help? Reply to this email or visit our <a href="${process.env.FRONTEND_URL}/docs">documentation</a>.</p>
      <p>Best regards,<br>The NLQDB Team</p>
    `;

    return this.sendEmail({
      to: user.email,
      subject,
      text,
      html
    });
  }

  /**
   * Team invitation email
   */
  async sendTeamInvitation(invitedUser, organization, inviter) {
    const inviteUrl = `${process.env.FRONTEND_URL}/accept-invite?token=${invitedUser.emailVerificationToken}`;
    
    const subject = `${inviter.name} invited you to join ${organization.name} on NLQDB`;
    const text = `
Hi ${invitedUser.name},

${inviter.name} (${inviter.email}) has invited you to join "${organization.name}" on NLQDB.

Accept your invitation: ${inviteUrl}

About NLQDB:
NLQDB is a natural language query platform that lets you query databases using plain English.

This invitation will expire in 7 days.

Best regards,
The NLQDB Team
    `;

    const html = `
      <h1>You've been invited to NLQDB!</h1>
      <p>Hi ${invitedUser.name},</p>
      <p><strong>${inviter.name}</strong> (${inviter.email}) has invited you to join <strong>${organization.name}</strong> on NLQDB.</p>
      <p><a href="${inviteUrl}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Accept Invitation</a></p>
      <p><strong>About NLQDB:</strong><br>
      NLQDB is a natural language query platform that lets you query databases using plain English.</p>
      <p style="color: #666; font-size: 12px;">This invitation will expire in 7 days.</p>
      <p>Best regards,<br>The NLQDB Team</p>
    `;

    return this.sendEmail({
      to: invitedUser.email,
      subject,
      text,
      html
    });
  }

  /**
   * Subscription confirmation email
   */
  async sendSubscriptionConfirmation(user, organization, plan) {
    const subject = `Subscription Confirmed - ${plan.toUpperCase()} Plan`;
    const text = `
Hi ${user.name},

Your ${plan.toUpperCase()} subscription for "${organization.name}" is now active!

Plan Details:
- Queries per month: ${organization.limits.queriesPerMonth === -1 ? 'Unlimited' : organization.limits.queriesPerMonth}
- Tokens per month: ${organization.limits.tokensPerMonth === -1 ? 'Unlimited' : organization.limits.tokensPerMonth.toLocaleString()}
- Team members: ${organization.limits.maxTeamMembers === -1 ? 'Unlimited' : organization.limits.maxTeamMembers}

Manage your subscription: ${process.env.FRONTEND_URL}/billing

Thank you for choosing NLQDB!

Best regards,
The NLQDB Team
    `;

    const html = `
      <h1>Subscription Confirmed!</h1>
      <p>Hi ${user.name},</p>
      <p>Your <strong>${plan.toUpperCase()}</strong> subscription for "${organization.name}" is now active!</p>
      <h3>Plan Details:</h3>
      <ul>
        <li>Queries per month: ${organization.limits.queriesPerMonth === -1 ? 'Unlimited' : organization.limits.queriesPerMonth}</li>
        <li>Tokens per month: ${organization.limits.tokensPerMonth === -1 ? 'Unlimited' : organization.limits.tokensPerMonth.toLocaleString()}</li>
        <li>Team members: ${organization.limits.maxTeamMembers === -1 ? 'Unlimited' : organization.limits.maxTeamMembers}</li>
      </ul>
      <p><a href="${process.env.FRONTEND_URL}/billing">Manage your subscription</a></p>
      <p>Thank you for choosing NLQDB!</p>
      <p>Best regards,<br>The NLQDB Team</p>
    `;

    return this.sendEmail({
      to: user.email,
      subject,
      text,
      html
    });
  }

  /**
   * Subscription alert email (past due, canceled, etc.)
   */
  async sendSubscriptionAlert(user, organization, status) {
    let subject, message;

    switch (status) {
      case 'past_due':
        subject = 'Payment Failed - Action Required';
        message = 'Your recent payment failed. Please update your payment method to avoid service interruption.';
        break;
      case 'canceled':
        subject = 'Subscription Canceled';
        message = 'Your subscription has been canceled. You can reactivate it anytime from your billing settings.';
        break;
      case 'unpaid':
        subject = 'Payment Overdue - Action Required';
        message = 'Your payment is overdue. Please update your payment information immediately to restore full access.';
        break;
      default:
        subject = 'Subscription Status Update';
        message = 'There has been a change to your subscription status.';
    }

    const text = `
Hi ${user.name},

${message}

Organization: ${organization.name}
Status: ${status}

Update payment method: ${process.env.FRONTEND_URL}/billing

If you have questions, contact us at ${this.supportEmail}

Best regards,
The NLQDB Team
    `;

    const html = `
      <h1>${subject}</h1>
      <p>Hi ${user.name},</p>
      <p>${message}</p>
      <p><strong>Organization:</strong> ${organization.name}<br>
      <strong>Status:</strong> ${status}</p>
      <p><a href="${process.env.FRONTEND_URL}/billing" style="background-color: #f44336; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Update Payment Method</a></p>
      <p>If you have questions, contact us at ${this.supportEmail}</p>
      <p>Best regards,<br>The NLQDB Team</p>
    `;

    return this.sendEmail({
      to: user.email,
      subject,
      text,
      html
    });
  }

  /**
   * Subscription canceled email
   */
  async sendSubscriptionCanceled(user, organization) {
    const subject = 'Subscription Canceled';
    const text = `
Hi ${user.name},

Your subscription for "${organization.name}" has been canceled and you've been downgraded to the FREE plan.

You still have access to:
- 100 queries per month
- Basic features

Want to upgrade again? Visit your billing page anytime.

We'd love to hear your feedback: ${this.supportEmail}

Best regards,
The NLQDB Team
    `;

    const html = `
      <h1>Subscription Canceled</h1>
      <p>Hi ${user.name},</p>
      <p>Your subscription for "${organization.name}" has been canceled and you've been downgraded to the <strong>FREE</strong> plan.</p>
      <h3>You still have access to:</h3>
      <ul>
        <li>100 queries per month</li>
        <li>Basic features</li>
      </ul>
      <p>Want to upgrade again? <a href="${process.env.FRONTEND_URL}/billing">Visit your billing page</a> anytime.</p>
      <p>We'd love to hear your feedback: ${this.supportEmail}</p>
      <p>Best regards,<br>The NLQDB Team</p>
    `;

    return this.sendEmail({
      to: user.email,
      subject,
      text,
      html
    });
  }

  /**
   * Invoice receipt email
   */
  async sendInvoiceReceipt(user, organization, invoice) {
    const amount = (invoice.amount_paid / 100).toFixed(2);
    const subject = `Receipt for $${amount} - ${organization.name}`;
    
    const text = `
Hi ${user.name},

Thank you for your payment!

Invoice Details:
- Amount: $${amount} ${invoice.currency.toUpperCase()}
- Date: ${new Date(invoice.created * 1000).toLocaleDateString()}
- Invoice: ${invoice.number || invoice.id}

Organization: ${organization.name}

View invoice: ${invoice.hosted_invoice_url || process.env.FRONTEND_URL + '/billing'}

Best regards,
The NLQDB Team
    `;

    const html = `
      <h1>Payment Receipt</h1>
      <p>Hi ${user.name},</p>
      <p>Thank you for your payment!</p>
      <h3>Invoice Details:</h3>
      <ul>
        <li><strong>Amount:</strong> $${amount} ${invoice.currency.toUpperCase()}</li>
        <li><strong>Date:</strong> ${new Date(invoice.created * 1000).toLocaleDateString()}</li>
        <li><strong>Invoice:</strong> ${invoice.number || invoice.id}</li>
      </ul>
      <p><strong>Organization:</strong> ${organization.name}</p>
      <p><a href="${invoice.hosted_invoice_url || process.env.FRONTEND_URL + '/billing'}">View Invoice</a></p>
      <p>Best regards,<br>The NLQDB Team</p>
    `;

    return this.sendEmail({
      to: user.email,
      subject,
      text,
      html
    });
  }

  /**
   * Payment failed email
   */
  async sendPaymentFailed(user, organization, invoice) {
    const amount = (invoice.amount_due / 100).toFixed(2);
    const subject = 'Payment Failed - Action Required';
    
    const text = `
Hi ${user.name},

We couldn't process your payment of $${amount} for "${organization.name}".

Please update your payment method to avoid service interruption.

Update payment: ${process.env.FRONTEND_URL}/billing

If you recently updated your payment info, please disregard this message.

Need help? Contact us at ${this.supportEmail}

Best regards,
The NLQDB Team
    `;

    const html = `
      <h1>Payment Failed</h1>
      <p>Hi ${user.name},</p>
      <p>We couldn't process your payment of <strong>$${amount}</strong> for "${organization.name}".</p>
      <p>Please update your payment method to avoid service interruption.</p>
      <p><a href="${process.env.FRONTEND_URL}/billing" style="background-color: #f44336; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Update Payment Method</a></p>
      <p style="color: #666; font-size: 14px;">If you recently updated your payment info, please disregard this message.</p>
      <p>Need help? Contact us at ${this.supportEmail}</p>
      <p>Best regards,<br>The NLQDB Team</p>
    `;

    return this.sendEmail({
      to: user.email,
      subject,
      text,
      html
    });
  }

  /**
   * Usage alert email (80% quota reached)
   */
  async sendUsageAlert(user, organization, quotaType, percentage) {
    const subject = `Usage Alert: ${percentage}% of ${quotaType} quota used`;
    const text = `
Hi ${user.name},

Your organization "${organization.name}" has used ${percentage}% of your ${quotaType} quota for this month.

Current Plan: ${organization.plan.toUpperCase()}

To avoid hitting limits, consider upgrading your plan: ${process.env.FRONTEND_URL}/billing

View usage: ${process.env.FRONTEND_URL}/dashboard

Best regards,
The NLQDB Team
    `;

    const html = `
      <h1>Usage Alert</h1>
      <p>Hi ${user.name},</p>
      <p>Your organization "${organization.name}" has used <strong>${percentage}%</strong> of your ${quotaType} quota for this month.</p>
      <p><strong>Current Plan:</strong> ${organization.plan.toUpperCase()}</p>
      <p>To avoid hitting limits, consider <a href="${process.env.FRONTEND_URL}/billing">upgrading your plan</a>.</p>
      <p><a href="${process.env.FRONTEND_URL}/dashboard">View usage details</a></p>
      <p>Best regards,<br>The NLQDB Team</p>
    `;

    return this.sendEmail({
      to: user.email,
      subject,
      text,
      html
    });
  }
}

export default new EmailService();
