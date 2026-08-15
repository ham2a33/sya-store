import Link from 'next/link';
import FooterCatalogLinks from './FooterCatalogLinks';

export default function SiteFooter() {
  return (
    <footer id="contacts">
      <div className="footer-brand">
        <div className="logo">
          SYA <span>made to glow ✨</span>
        </div>
        <p>
          Украшения, которые
          <br />
          подчеркивают вашу красоту
        </p>
      </div>
      <div>
        <h4>КАТАЛОГ</h4>
        <FooterCatalogLinks />
      </div>
      <div>
        <h4>ИНФОРМАЦИЯ</h4>
        <a>О бренде</a>
        <a>Доставка и оплата</a>
        <a>Возврат и обмен</a>
        <a>Контакты</a>
      </div>
      <div>
        <h4>КОНТАКТЫ</h4>
        <a>+7 700 732 31 57</a>
        <a>@sya.buyer</a>
        <a>WhatsApp</a>
      </div>
      <div>
        <h4>МЫ ПРИНИМАЕМ</h4>
        <strong className="payments">kaspi &nbsp; VISA &nbsp; Mastercard</strong>
      </div>
      <small>© 2026 SYA — made to glow ✨. Все права защищены.</small>
    </footer>
  );
}
