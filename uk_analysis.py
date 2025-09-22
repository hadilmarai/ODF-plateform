"""
UK Funding Analysis Module
Extracted from innovateuk.ipynb for reliable API execution
"""

import pandas as pd
import os
import time
import re
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from groq import Groq
from tqdm import tqdm
import logging

logger = logging.getLogger(__name__)

class UKAnalysis:
    def __init__(self):
        self.groq_client = Groq(api_key="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")
        self.model_name = "llama3-70b-8192"
        self.setup_selenium()
        self.setup_keywords()
        self.setup_odf_projects()
    
    def setup_selenium(self):
        """Setup Chrome WebDriver"""
        self.chrome_options = Options()
        self.chrome_options.add_argument("--headless")
        self.chrome_options.add_argument("--disable-gpu")
        self.chrome_options.add_argument("--window-size=1920,1080")
        self.chrome_options.add_argument("--no-sandbox")
        self.chrome_options.add_argument("--disable-dev-shm-usage")
        
        chromedriver_path = r"chromedriver-win64\chromedriver.exe"
        if os.path.exists(chromedriver_path):
            self.service = Service(chromedriver_path)
        else:
            logger.warning("ChromeDriver not found, using system PATH")
            self.service = None
    
    def setup_keywords(self):
        """Setup ODF keywords for matching"""
        self.keywords = {
            "strategic consulting": "conseil stratégique",
            "technical assistance": "assistance technique",
            "institutional support": "appui institutionnel",
            "innovation support": "accompagnement à l'innovation",
            "capacity building": "développement de capacités",
            "project management": "gestion de projet",
            "deeptech": "deeptech",
            "biotechnology": "biotechnologie",
            "artificial intelligence": "intelligence artificielle",
            "machine learning": "machine learning",
            "sustainable development": "développement durable",
            "digital transformation": "transformation numérique",
            "startup ecosystem": "écosystème startup",
            "entrepreneurship": "entrepreneuriat",
            "incubation": "incubation",
            "acceleration": "accélération"
        }
    
    def setup_odf_projects(self):
        """Setup ODF projects reference data"""
        self.odf_projects = [
            {
                "Project Name": "FACTORIAT",
                "Description": "Support Deeptech & Hardware startups in prototyping and tech maturation with technical and financial help.",
                "Axes / Thematic Areas": "Deeptech, Hardware, Incubation, Prototyping, Acceleration"
            },
            {
                "Project Name": "National Entrepreneurship Program",
                "Description": "Design and implementation of Lesotho's national entrepreneurship ecosystem.",
                "Axes / Thematic Areas": "Capacity building, Strategy, Startup Ecosystem"
            },
            {
                "Project Name": "MDBAN – Business Angels Network",
                "Description": "Support early-stage Maghreb startups via diaspora angel investment.",
                "Axes / Thematic Areas": "Startup Support, Investment, Diaspora Engagement"
            }
        ]
    
    def scrape_ukri_projects(self):
        """Scrape UK funding opportunities from UKRI"""
        logger.info("Starting UKRI web scraping...")
        
        try:
            if self.service:
                driver = webdriver.Chrome(service=self.service, options=self.chrome_options)
            else:
                driver = webdriver.Chrome(options=self.chrome_options)
            
            base_url = "https://www.ukri.org"
            url = "https://www.ukri.org/opportunity/?filter_council%5B%5D=all&filter_status%5B%5D=open&filter_status%5B%5D=closed&sort_by=closing_date&sort_order=desc"
            
            driver.get(url)
            time.sleep(5)
            
            projects = []
            page_num = 1
            
            while True:
                logger.info(f"Scraping page {page_num}...")
                
                # Wait for projects to load
                WebDriverWait(driver, 30).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "h3.card__title a"))
                )
                
                # Get project links
                project_links = driver.find_elements(By.CSS_SELECTOR, "h3.card__title a")
                logger.info(f"Found {len(project_links)} projects on page {page_num}")
                
                for link in project_links:
                    try:
                        title = link.text.strip()
                        href = link.get_attribute("href")
                        if href and href.startswith("/"):
                            href = base_url + href
                        
                        # Get additional info from card
                        card = link.find_element(By.XPATH, "./ancestor::div[contains(@class, 'card')]")
                        
                        # Extract status
                        status = "Unknown"
                        try:
                            status_elem = card.find_element(By.CSS_SELECTOR, ".card__status")
                            status = status_elem.text.strip()
                        except:
                            pass
                        
                        # Extract dates
                        dates = "Unknown"
                        try:
                            date_elem = card.find_element(By.CSS_SELECTOR, ".card__date")
                            dates = date_elem.text.strip()
                        except:
                            pass
                        
                        projects.append({
                            "Title": title,
                            "Link": href,
                            "Status": status,
                            "Dates": dates
                        })
                        
                    except Exception as e:
                        logger.error(f"Error extracting project info: {e}")
                        continue
                
                # Check for next page
                try:
                    next_button = driver.find_element(By.CSS_SELECTOR, "a.pagination__next")
                    if "disabled" in next_button.get_attribute("class"):
                        break
                    
                    driver.execute_script("arguments[0].click();", next_button)
                    page_num += 1
                    time.sleep(3)
                    
                except:
                    logger.info("No more pages found")
                    break
            
            driver.quit()
            logger.info(f"Scraping complete. Found {len(projects)} total projects")
            
            return pd.DataFrame(projects)
            
        except Exception as e:
            logger.error(f"Error during UKRI scraping: {e}")
            return pd.DataFrame()
    
    def check_keywords(self, text):
        """Check for keyword matches in text"""
        if not text:
            return "No", ""
        
        text_lower = text.lower()
        matched_keywords = [kw for kw in self.keywords.keys() if kw.lower() in text_lower]
        
        return ("Yes" if matched_keywords else "No", ", ".join(matched_keywords))
    
    def extract_text_from_url(self, url):
        """Extract text content from URL using Selenium"""
        try:
            if self.service:
                driver = webdriver.Chrome(service=self.service, options=self.chrome_options)
            else:
                driver = webdriver.Chrome(options=self.chrome_options)
            
            driver.get(url)
            time.sleep(5)
            
            # Scroll to load dynamic content
            for _ in range(10):
                driver.execute_script("window.scrollBy(0, 500);")
                time.sleep(0.3)
            time.sleep(3)
            
            # Extract main content
            content_selectors = [
                ".opportunity-detail__content",
                ".main-content",
                ".content",
                "main"
            ]
            
            content_text = ""
            for selector in content_selectors:
                try:
                    element = driver.find_element(By.CSS_SELECTOR, selector)
                    content_text = element.text.strip()
                    if content_text:
                        break
                except:
                    continue
            
            driver.quit()
            
            return content_text if content_text else "No content detected."
            
        except Exception as e:
            logger.error(f"Error extracting text from {url}: {e}")
            return f"Error: {e}"
    
    def query_groq(self, prompt):
        """Query Groq API for LLM analysis"""
        try:
            response = self.groq_client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "Tu es un expert en comparaison de projets R&D."},
                    {"role": "user", "content": prompt}
                ],
                temperature=1.0,
                max_tokens=3000
            )
            time.sleep(10)  # Rate limiting
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Groq API error: {e}")
            return f"Erreur Groq: {e}"
    
    def build_prompt(self, site_text):
        """Build prompt for Groq analysis"""
        projects_text = "\n".join([
            f"{i+1}. {p['Project Name']} : {p['Description']} (axe {p['Axes / Thematic Areas']})"
            for i, p in enumerate(self.odf_projects[:3])
        ])
        
        return f"""
Tu es un expert en analyse de projets d'entreprise.

Voici une liste de projets que cette entreprise a déjà réalisés :

{projects_text}

Voici maintenant le contenu d'un appel à projets britannique (UKRI) :

{site_text[:800]}

Peux-tu me dire si cette opportunité est pertinente par rapport aux projets de l'entreprise ?
Merci de répondre clairement :
- Pertinence : Oui / Non
- Résumé rapide expliquant ta réponse.
"""
    
    def parse_groq_result(self, text):
        """Parse Groq response to extract pertinence and summary"""
        pertinence = "Non"
        resume = ""
        
        try:
            # Extract pertinence
            match = re.search(r"(?i)pertinence\s*[:\-–]\s*(oui|non)", text)
            if match:
                pertinence = match.group(1).capitalize()
            
            # Extract summary
            resume_match = re.search(r"(?i)résumé.*?:\s*(.+)", text)
            if resume_match:
                resume = resume_match.group(1).strip()
            else:
                # Take first few lines as summary
                lines = text.split('\n')
                resume = ' '.join(lines[1:4]).strip()
        except:
            pass
        
        return pertinence, resume
    
    def run_analysis(self):
        """Run complete UK analysis"""
        logger.info("Starting UK funding analysis...")
        
        # Step 1: Scrape UKRI projects
        df = self.scrape_ukri_projects()
        
        if df.empty:
            logger.error("No UK project data found")
            return None
        
        # Save raw data
        df.to_excel("projets_UKRI_full.xlsx", index=False)
        
        # Step 2: Keyword analysis
        logger.info("Running keyword analysis...")
        df[["Pertinence", "Matching Word(s)"]] = df.apply(
            lambda row: pd.Series(self.check_keywords(row.get('Title', ''))),
            axis=1
        )
        
        # Save keyword results
        df.to_excel("projets_UKRI_with_keywords.xlsx", index=False)
        logger.info(f"Keyword analysis complete. {len(df[df['Pertinence'] == 'Yes'])} relevant projects found")
        
        # Step 3: LLM analysis on relevant projects
        relevant_df = df[df["Pertinence"] == "Yes"].copy()
        if len(relevant_df) == 0:
            logger.warning("No relevant projects found for LLM analysis")
            return df
        
        logger.info(f"Running LLM analysis on {len(relevant_df)} relevant projects...")
        llm_results = []
        
        for idx, row in tqdm(relevant_df.iterrows(), total=len(relevant_df), desc="UK LLM Analysis"):
            try:
                site_text = self.extract_text_from_url(row['Link'])
                prompt = self.build_prompt(site_text)
                groq_response = self.query_groq(prompt)
                pertinence, resume = self.parse_groq_result(groq_response)
                
                llm_results.append({
                    "URL": row['Link'],
                    "Pertinence LLM": pertinence,
                    "Résumé LLM": resume,
                    "Réponse brute": groq_response
                })
                
            except Exception as e:
                logger.error(f"Error in LLM analysis for {row['Link']}: {e}")
                llm_results.append({
                    "URL": row['Link'],
                    "Pertinence LLM": "Erreur",
                    "Résumé LLM": f"Erreur: {e}",
                    "Réponse brute": str(e)
                })
        
        # Merge results
        llm_df = pd.DataFrame(llm_results)
        final_df = relevant_df.merge(llm_df, left_on='Link', right_on='URL', how='left')
        
        # Save final results
        final_df.to_excel("df_final_ukllm.xlsx", index=False)
        
        # Save only LLM-approved projects
        final_yes_df = final_df[final_df['Pertinence LLM'] == 'Oui'].copy()
        final_yes_df.to_excel("df_final_yes_uk_llm.xlsx", index=False)
        
        logger.info(f"UK analysis complete. {len(final_yes_df)} projects approved by LLM")
        
        return final_df

if __name__ == "__main__":
    analysis = UKAnalysis()
    result = analysis.run_analysis()
    print(f"Analysis complete. Results saved to df_final_yes_uk_llm.xlsx")
