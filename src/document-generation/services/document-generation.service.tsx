import React from "react";
import { Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { SessionSettingsService } from "src/common/services/session-settings.service";
import { Paper } from "src/papers/entities/paper.entity";
import { DataSource, Repository } from "typeorm";
import { Font, renderToBuffer } from "@react-pdf/renderer";
import { SignUpForm } from "../templates/sign-up-form";
import path from "path";
import { LiquidationForm } from "../templates/liquidation-form";
import { StatutoryDeclaration } from "../templates/statutory_declaration";
import { StudentDocumentGenerationProps } from "src/lib/interfaces/student-document-generation-props.interface";

@Injectable()
export class DocumentGenerationService {

  constructor(
    private readonly dataSource: DataSource,
    private readonly sessionSettingsService: SessionSettingsService,
  ) {
    Font.register({
      family: 'Liberation Serif',
      fonts: [
        { src: path.join(process.cwd(), 'assets/fonts/LiberationSerif-Regular.ttf') },
        { src: path.join(process.cwd(), 'assets/fonts/LiberationSerif-Bold.ttf'), fontWeight: 'bold' },
        { src: path.join(process.cwd(), 'assets/fonts/LiberationSerif-Italic.ttf'), fontStyle: 'italic' },
      ],
    });
    Font.registerHyphenationCallback(word => [word]);

    this.papersRepository = this.dataSource.getRepository(Paper);
  }

  private papersRepository: Repository<Paper>;

  async getStudentDocumentGenerationProps(paperId: number): Promise<StudentDocumentGenerationProps> {
    const paper = await this.papersRepository.findOne({
      where: { id: paperId },
      relations: {
        teacher: { profile: false },
        student: { 
          profile: false,
          extraData: true,
          specialization: {
            domain: true,
          }
        },
      }
    });
    if(!paper) {
      throw new NotFoundException(`Paper with id ${paperId} not found`);
    }
    return {
      student: paper.student,
      paper,
      sessionSettings: await this.sessionSettingsService.getSettings(),
    }
  }

  generatePaperDocument(name: string, props: StudentDocumentGenerationProps) {
    switch(name) {
      case 'sign_up_form':
        return this.generateSignUpForm(props);
      case 'liquidation_form':
        return this.generateLiquidationForm(props);
      case 'statutory_declaration':
        return this.generateStatutoryDeclaration(props);
      default:
        throw new InternalServerErrorException(`No document generation template found for document name: ${name}`);
    }
  }

  generateSignUpForm(props: StudentDocumentGenerationProps) {
    return renderToBuffer(<SignUpForm {...props} />);
  }

  generateLiquidationForm(props: StudentDocumentGenerationProps) {
    return renderToBuffer(<LiquidationForm {...props} />);
  }

  generateStatutoryDeclaration(props: StudentDocumentGenerationProps) {
    return renderToBuffer(<StatutoryDeclaration {...props} />);
  }
  
}